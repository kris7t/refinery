/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.generator.cli.output;

import com.beust.jcommander.IParametersValidator;
import com.beust.jcommander.ParameterException;
import tools.refinery.generator.cli.utils.CliUtils;

import java.util.Map;
import java.util.Optional;

public class OutputOptionsValidator implements IParametersValidator {
	@Override
	public void validate(Map<String, Object> parameters) throws ParameterException {
		var outputPath = (String) parameters.get("-output");
		var format = Optional.ofNullable((OutputFormat) parameters.get("-format"))
				.or(() -> OutputFormat.getFromOutputPath(outputPath))
				.orElse(OutputFormat.REFINERY);
		var transparent = (Boolean) parameters.get("-transparent");
		var embedFonts = (Boolean) parameters.get("-embed-fonts");
		var theme = (OutputTheme) parameters.get("-theme");
		var scale = (Integer) parameters.get("-scale");
		var console = System.console();
		boolean isTerminal = console != null && console.isTerminal();
		if (CliUtils.isStandardStream(outputPath) && isTerminal && format.isConsoleOutputAllowed()) {
			throw new ParameterException("Output format %s cannot be printed to the console".formatted(format));
		}
		boolean isGraphical = format.isRendererNeeded();
		if (!isGraphical && Boolean.TRUE.equals(transparent)) {
			throw new ParameterException("Output format %s cannot have a transparent background".formatted(format));
		}
		boolean canEmbedFonts = format == OutputFormat.PDF ||
				(format == OutputFormat.SVG && theme != OutputTheme.AUTO);
		if (!canEmbedFonts && Boolean.TRUE.equals(embedFonts)) {
			throw new ParameterException("The selected output configuration cannot embed fonts.");
		}
		if (!isGraphical && theme != null) {
			throw new ParameterException("Output format %s cannot set an output theme.".formatted(format));
		}
		if (format != OutputFormat.SVG && theme == OutputTheme.AUTO) {
			throw new ParameterException("Output format %s cannot set an automatic output theme.".formatted(format));
		}
		if (format != OutputFormat.PNG && scale != null) {
			throw new ParameterException("Output format %s cannot set a scale factor.".formatted(format));
		}
	}
}
