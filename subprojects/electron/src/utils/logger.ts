/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(
  {
    level: process.env['MODE'] === 'production' ? 'warn' : 'debug',
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
