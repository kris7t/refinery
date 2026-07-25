/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import getLogger from "./utils/getLogger";
import spawnJava from "./utils/spawnJava";

const log = getLogger('cli');

const args = process.argv.slice(2);

const childProcess = spawnJava(
  'refinery-generator-cli',
  'tools.refinery.generator.cli.RefineryCli',
  args,
  {},
);

childProcess.once('error', (err) => {
  log.error({ err }, 'Initialization error');
  process.exit(-1);
});

childProcess.once('exit', (code) => process.exit(code));
