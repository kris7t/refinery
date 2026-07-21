/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import type { ChildProcess } from 'node:child_process';
import path from 'node:path';

import type BackendConfig from '@tools.refinery/frontend/xtext/BackendConfig';

import ServerManager from './ServerManager';
import spawn from './utils/spawn';

export default class BackendManager extends ServerManager {
  constructor(
    port: number,
    private readonly allowedOrigins: string[] = [],
  ) {
    super('BackendManager', port);
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
      return spawn(
        gradlewCommand,
        ['--console=plain', '--quiet', '--stacktrace', 'serveBackend'],
        {
          cwd: path.resolve(__dirname, '../../../../..'),
          env: envVars,
        },
      );
    } else {
      const javaDir = path.resolve(process.resourcesPath, 'jre');
      const javaBinDir = path.join(javaDir, 'bin');
      const pathEnv = process.env['PATH'];
      const newPathEnv =
        pathEnv === undefined || pathEnv === ''
          ? javaBinDir
          : `${javaBinDir}${path.delimiter}${pathEnv}`;
      const backendCommand = path.resolve(
        process.resourcesPath,
        'backend',
        'bin',
        'refinery-language-web',
      );
      return spawn(backendCommand, [], {
        env: {
          ...envVars,
          PATH: newPathEnv,
          JAVA_HOME: javaDir,
        },
      });
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
