/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.generator.cli.headless;

import tools.refinery.generator.cli.output.OutputOptions;

import java.io.IOException;

public class GraphRenderer {
	public byte[] render(OutputOptions options, byte[] serializedJson) throws IOException {
		try (var headless = HeadlessRefinery.connect()) {
			return headless.interact(serializedJson);
		}
	}
}
