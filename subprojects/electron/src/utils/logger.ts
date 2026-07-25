/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import pino from 'pino';
import pretty from 'pino-pretty';

const logLevel =
  process.env['REFINERY_LOG_LEVEL']?.toLowerCase() ??
  (process.isDev ? 'debug' : 'warn');

const logger = pino(
  {
    level: logLevel,
  },
  pretty({
    destination: 2,
  }),
);

process.on('uncaughtException', (err) =>
  logger.error({ err }, 'Uncaught exception'),
);

process.on('unhandledRejection', (err) =>
  logger.error({ err }, 'Unhandled promise rejection'),
);

export default logger;
