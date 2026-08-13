/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

// Every render embeds a random `nanoid()` ID (21 characters by default) as a
// CSS class/element-ID prefix, to avoid collisions when multiple diagrams are
// embedded in the same HTML page. The root `<svg>` element's `class`
// attribute is exactly `refinery-<id>` with nothing else appended, so it is a
// safe, precise anchor to recover the exact token: extracting it any other
// way (e.g. splitting on `-`) is unsafe, since the token's own alphabet
// includes `-`.
const ROOT_CLASS_PATTERN = /class="refinery-([A-Za-z0-9_-]{21})"/;

/** Replaces the per-render random ID with a fixed placeholder so that
 * otherwise-deterministic SVG output can be snapshotted. */
export default function normalizeSVG(svg: string): string {
  const match = ROOT_CLASS_PATTERN.exec(svg);
  if (!match) {
    return svg;
  }
  const [, id] = match;
  return svg.replaceAll(`refinery-${id}`, 'refinery-ID');
}
