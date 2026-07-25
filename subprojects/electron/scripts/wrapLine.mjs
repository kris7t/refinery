/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

/**
 * Line-wraps a MANIFEST.MF entry.
 *
 * @param {string} line The manifest line.
 * @returns The wrapped line.
 */
export default function wrapLine(line) {
  const enc = new TextEncoder();
  const pieces = [];
  let cur = "";
  let bytes = 0;
  let budget = 72;
  for (const ch of line) {
    const w = enc.encode(ch).length;
    if (bytes + w > budget) {
      pieces.push(cur);
      [cur, bytes, budget] = ["", 0, 71];
    }
    cur += ch;
    bytes += w;
  }
  if (cur || pieces.length === 0) pieces.push(cur);
  return pieces.map((p, i) => (i === 0 ? p : ` ${p}`)).join("\r\n");
}
