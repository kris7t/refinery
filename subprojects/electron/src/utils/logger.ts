/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import pino, { type DestinationStream } from 'pino';
import pretty from 'pino-pretty';

const logLevel =
  process.env['REFINERY_LOG_LEVEL']?.toLowerCase() ??
  (process.isDev ? 'debug' : 'warn');

function getDestination(): DestinationStream {
  const setting = process.env['REFINERY_LOG_DESTINATION'] ?? 'pretty';
  switch (setting) {
    case 'stdout':
      return pino.destination(1);
    case 'stderr':
      return pino.destination(2);
    case 'pretty':
      return pretty({ destination: 2 });
    default:
      throw new Error(`Unknown log destination: ${setting}`);
  }
}

export const destination = getDestination();

const logger = pino(
  {
    level: logLevel,
  },
  destination,
);

process.on('uncaughtException', (err) =>
  logger.error({ err }, 'Uncaught exception'),
);

process.on('unhandledRejection', (err) =>
  logger.error({ err }, 'Unhandled promise rejection'),
);

export default logger;
