/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import type { ChildProcess } from 'node:child_process';
import path from 'node:path';

import type BackendConfig from '@tools.refinery/frontend/xtext/BackendConfig';

import HttpServerManager from '../utils/HttpServerManager';
import spawnJava from '../utils/spawnJava';
import spawnScript from '../utils/spawnScript';

export default class BackendManager extends HttpServerManager {
  constructor(
    port: number,
    private readonly allowedOrigins: string[] = [],
  ) {
    super('gui.BackendManager', port);
  }

  protected override spawnChild(): ChildProcess {
    const envVars = {
      ...process.env,
      REFINERY_LISTEN_HOST: BackendManager.hostname,
      REFINERY_LISTEN_PORT: String(this.port),
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
