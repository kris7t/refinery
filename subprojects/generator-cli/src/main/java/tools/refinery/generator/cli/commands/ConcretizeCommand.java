/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
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

@Parameters(commandDescription = "Concretize a partial model")
public class ConcretizeCommand implements Command {
	private final CliProblemLoader loader;
	private final ModelSemanticsFactory semanticsFactory;
	private final CliProblemOutput serializer;

	private String inputPath;

	@ParametersDelegate
	private OutputOptions outputOptions = new OutputOptions();

	@Inject
	public ConcretizeCommand(CliProblemLoader loader, ModelSemanticsFactory semanticsFactory,
							 CliProblemOutput serializer) {
		this.loader = loader;
		this.semanticsFactory = semanticsFactory;
		this.serializer = serializer;
	}

	@Parameter(description = "input path", required = true)
	public void setInputPath(String inputPath) {
		this.inputPath = inputPath;
	}

	@Override
	public int run() throws IOException {
		var problem = loader.loadProblem(inputPath);
		try (var semantics = semanticsFactory.concretize(true).createSemantics(problem)) {
			serializer.saveModel(semantics, outputOptions.getOutputPath());
		}
		return RefineryCli.EXIT_SUCCESS;
	}
}
