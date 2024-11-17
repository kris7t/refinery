/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

const listener = (event: Event) => event.preventDefault();

export default function setSelectionEnabled(enabled: boolean): void {
  if (enabled) {
    document.body.removeEventListener('selectstart', listener, {
      capture: true,
    });
    return;
  }
  document.body.addEventListener('selectstart', listener, { capture: true });
}
