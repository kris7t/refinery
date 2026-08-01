/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.generator.cli.commands;

import com.beust.jcommander.Parameter;
import com.beust.jcommander.Parameters;
import com.beust.jcommander.ParametersDelegate;
import tools.refinery.generator.cli.output.OutputOptions;

import java.io.IOException;

@Parameters(commandDescription = "Evaluate a partial model without concretization")
public class SemanticsCommand implements OutputFormatCommand {
	private String inputPath;

	@ParametersDelegate
	private final OutputOptions.Json outputOptions = new OutputOptions.Json();

	@Parameter(description = "input path", required = true)
	public void setInputPath(String inputPath) {
		this.inputPath = inputPath;
    }

	public OutputOptions.Json getOutputOptions() {
		return outputOptions;
	}

	@Override
	public int run() throws IOException {
		return 0;
	}
}
