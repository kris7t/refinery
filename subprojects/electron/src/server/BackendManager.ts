/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import type { ChildProcess } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

import type BackendConfig from '@tools.refinery/frontend/xtext/BackendConfig';

import settings from '../settings';
import HttpServerManager from '../utils/HttpServerManager';
import spawnJava from '../utils/spawnJava';
import spawnScript from '../utils/spawnScript';

export default class BackendManager extends HttpServerManager {
  private startupPromise: Promise<void> | undefined;

  constructor(
    port: number,
    private readonly allowedOrigins: string[] = [],
  ) {
    super('gui.BackendManager', port);
  }

  override start(): Promise<void> {
    const startup = super.start();
    if (this.status === 'spawning') {
      // Prevent restarts requested during initial server startup
      // from signaling a fatal startup error.
      this.startupPromise = startup;
      const clearStartupPromise = () => {
        if (this.startupPromise === startup) {
          this.startupPromise = undefined;
        }
      };
      startup.then(clearStartupPromise, clearStartupPromise);
    }
    return startup;
  }

  protected override spawnChild(): ChildProcess {
    const threadCount = Math.min(os.cpus().length, 4);
    const envVars = {
      ...process.env,
      REFINERY_LISTEN_HOST: BackendManager.hostname,
      REFINERY_LISTEN_PORT: String(this.port),
      REFINERY_SEMANTICS_TIMEOUT_MS: String(
        settings.serverSettings.semanticsTimeoutMs,
      ),
      REFINERY_MODEL_GENERATION_TIMEOUT_SEC: String(
        settings.serverSettings.modelGenerationTimeoutSec,
      ),
      REFINERY_XTEXT_THREAD_COUNT: String(threadCount),
      ...(this.allowedOrigins.length === 0
        ? {}
        : {
            REFINERY_ALLOWED_ORIGINS: this.allowedOrigins.join(','),
          }),
    };
    if (process.isDev) {
      const gradlewCommand = `.${path.sep}gradlew`;
      return spawnScript(
        gradlewCommand,
        ['--console=plain', '--quiet', '--stacktrace', 'serveBackend'],
        {
          cwd: path.resolve(__dirname, '../../../../..'),
          env: envVars,
        },
      );
    } else {
      return spawnJava(
        'refinery-language-web',
        'tools.refinery.language.web.ServerLauncher',
        [],
        {
          env: envVars,
        },
      );
    }
  }

  async restart(): Promise<void> {
    // The initial startup is awaited instead of aborted. Aborting it would
    // reject runGUI's startup promise and make Electron quit while restarting.
    await this.startupPromise;
    await this.stop();
    await this.start();
  }

  get httpOrigin(): string {
    return `http://${BackendManager.hostname}:${this.port}`;
  }

  get webSocketOrigin(): string {
    return `ws://${BackendManager.hostname}:${this.port}`;
  }

  get backendConfig(): BackendConfig {
    return {
      apiBase: `${this.httpOrigin}/api/v1`,
      webSocketURL: `${this.webSocketOrigin}/xtext-service`,
    };
  }
}
