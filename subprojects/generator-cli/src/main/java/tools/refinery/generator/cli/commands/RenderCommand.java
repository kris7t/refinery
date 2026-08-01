/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.generator.cli.commands;

import com.beust.jcommander.Parameters;
import tools.refinery.generator.cli.headless.HeadlessRefinery;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Parameters(commandDescription = "Render a partial model as an image")
public class RenderCommand implements Command {
	@Override
	public int run() throws IOException {
		var endpoint = System.getenv("REFINERY_IPC_ENDPOINT");
		if (endpoint == null) {
			throw new RuntimeException("Must specify IPC endpoint");
		}
		try (var headless = HeadlessRefinery.connect(endpoint)) {
			var bytes = "Hello World!".getBytes(StandardCharsets.UTF_8);
			headless.send(bytes);
			var response = headless.receive();
			System.out.format("Received: %s%n", new String(response, StandardCharsets.UTF_8));
		}
		return 0;
	}
}
