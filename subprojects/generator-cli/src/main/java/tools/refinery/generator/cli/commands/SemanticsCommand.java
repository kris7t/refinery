/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.generator.cli.commands;

import com.beust.jcommander.Parameter;
import com.beust.jcommander.Parameters;
import com.beust.jcommander.ParametersDelegate;
import com.google.inject.Inject;
import tools.refinery.generator.ModelSemanticsFactory;
import tools.refinery.generator.cli.RefineryCli;
import tools.refinery.generator.cli.output.CliProblemOutput;
import tools.refinery.generator.cli.output.OutputOptions;
import tools.refinery.generator.cli.utils.CliProblemLoader;

import java.io.IOException;

@Parameters(commandDescription = "Evaluate a partial model without concretization")
public class SemanticsCommand implements OutputFormatCommand {
	private final CliProblemLoader loader;
	private final ModelSemanticsFactory semanticsFactory;
	private final CliProblemOutput serializer;

	private String inputPath;

	@ParametersDelegate
	private final OutputOptions.Json outputOptions = new OutputOptions.Json();

	@Inject
	public SemanticsCommand(CliProblemLoader loader, ModelSemanticsFactory semanticsFactory,
	                        CliProblemOutput serializer) {
		this.loader = loader;
		this.semanticsFactory = semanticsFactory;
		this.serializer = serializer;
	}

	@Parameter(description = "input path", required = true)
	public void setInputPath(String inputPath) {
		this.inputPath = inputPath;
    }

	public OutputOptions.Json getOutputOptions() {
		return outputOptions;
	}

	@Override
	public int run() throws IOException {
		var problem = loader.loadProblem(inputPath);
		try (var semantics = semanticsFactory.concretize(false).createSemantics(problem)) {
			serializer.saveModel(outputOptions, semantics);
		}
		return RefineryCli.EXIT_SUCCESS;
	}
}
