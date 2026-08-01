/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

if ('refineryHeadless' in window) {
  window.refineryHeadless.onRequest((body) => Promise.resolve(body));
}
