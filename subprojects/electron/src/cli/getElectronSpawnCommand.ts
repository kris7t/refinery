/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

export interface ElectronSpawnCommand {
  readonly command: string;
  readonly args: readonly string[];
}

/**
 * Determines how to launch `electronPath` (the current Electron binary) as a
 * headless process. On Linux, without a display, Chromium fails to start
 * so we wrap the launch in `xvfb-run`.
 */
export default function getElectronSpawnCommand(
  electronPath: string,
): ElectronSpawnCommand {
  const needsXvfb =
    process.platform === 'linux' &&
    !process.env['DISPLAY'] &&
    !process.env['WAYLAND_DISPLAY'];

  // Chromium's SUID sandbox needs `chrome-sandbox` to be owned by root with
  // mode 4755 (or user namespaces to be available and permitted), which is
  // only set up by the installers for packaged builds (see
  // `after-install.tpl`), not by an unpacked `electron-builder` output.
  const electronArgs =
    process.env['REFINERY_NO_SANDBOX'] === '1' ? ['--no-sandbox'] : [];

  if (needsXvfb) {
    // `-a`/`--auto-servernum` picks a free display number, so concurrent
    // invocations don't collide on the default fixed display. Chromium's
    // GL/compositor init needs more than Xvfb's default 8-bit depth, so an
    // explicit 24-bit screen is requested too.
    return {
      command: 'xvfb-run',
      args: [
        '-a',
        '--server-args=-screen 0 1280x1024x24',
        electronPath,
        ...electronArgs,
      ],
    };
  }
  return { command: electronPath, args: electronArgs };
}
