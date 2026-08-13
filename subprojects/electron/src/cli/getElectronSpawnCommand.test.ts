/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import getElectronSpawnCommand from './getElectronSpawnCommand';

const originalPlatform = process.platform;
const electronPath = 'electron-binary';

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
}

beforeEach(() => {
  vi.stubEnv('DISPLAY', '');
  vi.stubEnv('WAYLAND_DISPLAY', '');
});

afterEach(() => {
  setPlatform(originalPlatform);
  vi.unstubAllEnvs();
});

describe('on Linux', () => {
  beforeEach(() => {
    setPlatform('linux');
  });

  test('wraps the launch in xvfb-run without a display', () => {
    expect(getElectronSpawnCommand(electronPath)).toEqual({
      command: 'xvfb-run',
      args: ['-a', '--server-args=-screen 0 1280x1024x24', electronPath],
    });
  });

  test('does not wrap when DISPLAY is set', () => {
    vi.stubEnv('DISPLAY', ':0');
    expect(getElectronSpawnCommand(electronPath)).toEqual({
      command: electronPath,
      args: [],
    });
  });

  test('does not wrap when WAYLAND_DISPLAY is set', () => {
    vi.stubEnv('WAYLAND_DISPLAY', 'wayland-0');
    expect(getElectronSpawnCommand(electronPath)).toEqual({
      command: electronPath,
      args: [],
    });
  });
});

describe.each(['darwin', 'win32'] as const)('on %s', (platform) => {
  beforeEach(() => {
    setPlatform(platform);
  });

  test('never wraps, regardless of DISPLAY', () => {
    expect(getElectronSpawnCommand(electronPath)).toEqual({
      command: electronPath,
      args: [],
    });
  });
});

describe('REFINERY_NO_SANDBOX', () => {
  test('does not append --no-sandbox by default', () => {
    setPlatform('darwin');
    expect(getElectronSpawnCommand(electronPath).args).not.toContain(
      '--no-sandbox',
    );
  });

  test('appends --no-sandbox when set, without xvfb-run', () => {
    setPlatform('darwin');
    vi.stubEnv('REFINERY_NO_SANDBOX', '1');
    expect(getElectronSpawnCommand(electronPath)).toEqual({
      command: electronPath,
      args: ['--no-sandbox'],
    });
  });

  test('appends --no-sandbox after electronPath when wrapped in xvfb-run', () => {
    setPlatform('linux');
    vi.stubEnv('REFINERY_NO_SANDBOX', '1');
    expect(getElectronSpawnCommand(electronPath)).toEqual({
      command: 'xvfb-run',
      args: [
        '-a',
        '--server-args=-screen 0 1280x1024x24',
        electronPath,
        '--no-sandbox',
      ],
    });
  });
});
