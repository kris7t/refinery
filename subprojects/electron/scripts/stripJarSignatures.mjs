import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { rename } from 'node:fs/promises';
import path from 'node:path';
import { finished } from 'node:stream/promises';

import yauzl from 'yauzl';
import yazl from 'yazl';

import wrapLine from './wrapLine.mjs';

const SIG_FILE_RE = /^META-INF\/[^/]+\.(?:SF|RSA|DSA|EC)$/i;
const DIGEST_ATTR_RE = /^[A-Za-z0-9-]*Digest[A-Za-z0-9-]*\s*:/i;
const MANIFEST_NAME = 'META-INF/MANIFEST.MF';

/**
 * Unfolds a line-wrapped MANIFEST.MF entry.
 *
 * @param {string} raw The raw entry.
 * @returns {string} The unfolded entry.
 */
function unfold(raw) {
  return raw.replace(/\r\n?/g, '\n').replace(/\n /g, '');
}

/**
 * Rewrites a MANIFEST.MF, stripping all signatures from it.
 *
 * @param {string} raw The raw manifest.
 * @returns {string} The rewritten manifest.
 */
function rewriteManifest(raw) {
  const sections = unfold(raw)
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const kept = sections.flatMap((section, idx) => {
    const lines = section.split('\n').filter((l) => !DIGEST_ATTR_RE.test(l));
    if (idx === 0) {
      return [lines];
    }
    const hasRealAttr = lines.some((l) => !/^Name\s*:/i.test(l));
    return hasRealAttr ? [lines] : [];
  });

  if (kept.length === 0) {
    return 'Manifest-Version: 1.0\r\n';
  }
  return (
    kept.map((sec) => sec.map(wrapLine).join('\r\n')).join('\r\n\r\n') + '\r\n'
  );
}

/**
 * @param {string} src
 * @return {Promise<import('yauzl').ZipFile>}
 */
function openZip(src) {
  return new Promise((resolve, reject) =>
    yauzl.open(src, { lazyEntries: true }, (err, zip) =>
      err ? reject(err) : resolve(zip),
    ),
  );
}

/**
 * @param {import('yauzl').ZipFile} zip
 * @param {import('yauzl').Entry} entry
 * @returns {Promise<import('node:stream').Stream.Readable>}
 */
function openEntryStream(zip, entry) {
  return new Promise((resolve, reject) =>
    zip.openReadStream(entry, (err, rs) => (err ? reject(err) : resolve(rs))),
  );
}

/**
 * Yield each entry of a lazyEntries yauzl ZipFile, in order. Pull-driven: one
 * readEntry() per iteration, so nothing is read until the consumer asks for the
 * next entry. Rejects the consuming `for await` if the zip emits 'error'.
 *
 * @param {import('yauzl').ZipFile} zip  opened with { lazyEntries: true }
 * @returns {AsyncGenerator<import('yauzl').Entry, void, void>}
 */
async function* entries(zip) {
  while (true) {
    const controller = new AbortController();
    const { signal } = controller;
    const entryP = once(zip, 'entry', { signal }).then(
      (/** @type {import('yauzl').Entry[]} */ [e]) => e,
    );
    const endP = once(zip, 'end', { signal }).then(() => undefined);
    // Arm both listeners BEFORE requesting the next entry.
    zip.readEntry();
    let entry;
    try {
      entry = await Promise.race([entryP, endP]);
    } finally {
      // Drop the loser; its AbortError is consumed by race.
      controller.abort();
    }
    if (!entry) {
      return;
    }
    yield entry;
  }
}

/**
 * Enumerate entry names without opening any read stream (no inflation).
 *
 * @param {string} src
 * @returns {Promise<string[]>}
 */
async function entryNames(src) {
  const zip = await openZip(src);
  try {
    /** @type {string[]} */
    const names = [];
    for await (const entry of entries(zip)) {
      names.push(entry.fileName);
    }
    return names;
  } finally {
    zip.close();
  }
}

/**
 * @param {string[]} names
 * @returns {boolean}
 */
function isSigned(names) {
  return names.some((n) => SIG_FILE_RE.test(n));
}

/**
 * @param {string} name
 * @returns {boolean}
 */
function isDir(name) {
  return name.endsWith('/');
}

/**
 * Collect a read stream into one Buffer.
 *
 * @param {import('node:stream').Stream.Readable} rs
 * @returns {Promise<Buffer>}
 */
async function collect(rs) {
  const chunks = [];
  for await (const c of rs) {
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

/**
 * Rewrite a signed jar into destPath. One entry is processed at a time: the
 * next entry is read only after the current one's stream has ended, so a single
 * yauzl stream feeds yazl and backpressure propagates from the output file.
 *
 * @param {string} src The source jar path.
 * @param {string} dest The destination path, must be distinct from `src`.
 * @returns {Promise<void>}
 */
async function streamStrip(src, dest) {
  const zip = await openZip(src);
  const out = createWriteStream(dest);
  const zf = new yazl.ZipFile();

  const writeStreamFinished = finished(out);
  zf.outputStream.on('error', (/** @type {Error} */ e) => out.destroy(e));
  zf.outputStream.pipe(out);

  try {
    for await (const entry of entries(zip)) {
      const name = entry.fileName;
      if (isDir(name)) {
        zf.addEmptyDirectory(name, {
          mtime: entry.getLastModDate(),
          mode: 0o755,
        });
        continue;
      }
      if (SIG_FILE_RE.test(name)) continue;

      const rs = await openEntryStream(zip, entry);
      if (name.toUpperCase() === MANIFEST_NAME) {
        const rewritten = rewriteManifest(
          (await collect(rs)).toString('latin1'),
        );
        zf.addBuffer(Buffer.from(rewritten, 'latin1'), name, {
          mtime: entry.getLastModDate(),
          mode: 0o644,
        });
      } else {
        zf.addReadStream(rs, name, {
          mtime: entry.getLastModDate(),
          mode: 0o644,
        });
        await finished(rs);
      }
    }
    zf.end();
    await writeStreamFinished;
  } catch (e) {
    out.destroy(e instanceof Error ? e : new Error(String(e)));
    throw e;
  } finally {
    zip.close();
  }
}

const CLASS_SUFFIX = '.class';

/**
 * Removes jarsigner-style signing metadata (META-INF/*.SF, *.RSA/*.EC/*.DSA,
 * and *-Digest lines in MANIFEST.MF) so AppCDS will archive the classes. Class
 * bytes are unchanged.
 *
 * Streaming is scoped to the signed minority. Unsigned and allowlisted jars are
 * copied verbatim (copyFile: exact bytes, zero de/recompression). Signedness is
 * detected from entry *names* alone, inflating nothing. Signed jars are rewritten
 * through a per-entry pipeline — each yauzl read stream is piped straight into
 * yazl and the next entry is only read once the current one has been fully
 * consumed, so exactly one entry is in flight and backpressure runs end to end
 * from the output file back to the reader.
 *
 * This still inflates-then-deflates the entries it rewrites (true verbatim copy
 * of compressed bytes needs ZIP-header surgery neither library exposes), but it
 * bounds memory to a single entry's pipeline regardless of jar or entry size.
 *
 * DANGER: jars that verify their own signature at load (JCE providers such as
 * Bouncy Castle) break once de-signed.
 *
 * @param {string} jar The path to the jar to strip.
 * @returns {Promise<string[]>} The list of classes in the jar.
 */
export async function stripJarSignatures(jar) {
  const names = await entryNames(jar);
  if (isSigned(names)) {
    console.log('Stripping JAR', jar);
    const tmp = `${jar}.stripped.tmp`;
    await streamStrip(jar, tmp);
    await rename(tmp, jar);
  }
  return names
    .filter((name) => {
      const baseName = path.posix.basename(name);
      return (
        !name.startsWith('META-INF/') &&
        baseName.endsWith(CLASS_SUFFIX) &&
        baseName !== 'module-info.jar' &&
        baseName !== 'package-info.jar'
      );
    })
    .map((name) => name.slice(0, -CLASS_SUFFIX.length));
}
