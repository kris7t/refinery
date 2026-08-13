/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import ms from 'ms';
import {
  _electron as electron,
  type ElectronApplication,
  type Page,
} from 'playwright';
import { afterAll, beforeAll, describe, test } from 'vitest';

import getPackagedElectronPath from './getPackagedElectronPath';
import startXvfb, { type Xvfb } from './startXvfb';

function toStringEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

// Launches a real window, so we don't want it popping up during local runs.
describe.skipIf(process.env['CI'] !== 'true')(
  'gui smoke test',
  { timeout: ms('5m') },
  () => {
    let xvfb: Xvfb | undefined;
    let app: ElectronApplication;
    let window: Page;

    beforeAll(async () => {
      const needsXvfb =
        process.platform === 'linux' &&
        !process.env['DISPLAY'] &&
        !process.env['WAYLAND_DISPLAY'];
      const env = toStringEnv(process.env);
      delete env['ELECTRON_RUN_AS_NODE'];
      if (needsXvfb) {
        xvfb = await startXvfb();
        env['DISPLAY'] = xvfb.display;
        delete env['WAYLAND_DISPLAY'];
      }
      app = await electron.launch({
        executablePath: getPackagedElectronPath(),
        args:
          process.env['REFINERY_NO_SANDBOX'] === '1' ? ['--no-sandbox'] : [],
        env,
      });
      window = await app.firstWindow();
    }, ms('3m'));

    afterAll(async () => {
      await app?.close();
      xvfb?.stop();
    });

    test('shows the editor', async () => {
      await window.locator('.cm-editor').waitFor({
        state: 'visible',
        timeout: ms('1m'),
      });
    });

    test('renders the graph for the default model', async () => {
      await window
        .locator('svg g.node-default text', { hasText: 'sct' })
        .first()
        .waitFor({
          state: 'visible',
          timeout: ms('2m'),
        });
    });
  },
);
