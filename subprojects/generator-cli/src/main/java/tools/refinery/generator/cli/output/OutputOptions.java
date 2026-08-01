/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.generator.cli.output;

import com.beust.jcommander.Parameter;
import com.beust.jcommander.ParameterException;
import com.beust.jcommander.Parameters;
import tools.refinery.generator.cli.utils.CliUtils;

public sealed abstract class OutputOptions {
	private OutputFormat format;
	private String outputPath = CliUtils.STANDARD_OUTPUT_PATH;
	private boolean transparent = true;
	private boolean embedFonts = true;
	private OutputTheme theme = OutputTheme.LIGHT;
	private int scale = 1;

	public OutputFormat getFormat() {
		return format;
	}

	@Parameter(names = {"-format", "-f"}, description = "Output file format")
	public void setFormat(OutputFormat format) {
		this.format = format;
	}

	public boolean isTransparent() {
		return transparent;
	}

	@Parameter(names = "-transparent", description = "Transparent background for the output image. Only for svg, " +
			"pdf, or png output formats.", arity = 1)
	public void setTransparent(boolean transparent) {
		this.transparent = transparent;
	}

	public boolean isEmbedFonts() {
		return embedFonts;
	}

	@Parameter(names = "-embed-fonts", description = "Embed fonts into the output. Only for svg or pdf output " +
			"formats. Embedding fonts into an svg document is not possible with the auto output theme.", arity = 1)
	public void setEmbedFonts(boolean embedFonts) {
		this.embedFonts = embedFonts;
	}

	public OutputTheme getTheme() {
		return theme;
	}

	@Parameter(names = "-theme", description = "Output theme. Only for svg, pdf, or png output formats. The auto " +
			"theme for is for embedding into a HTML document directly, and is only supported for the svg output " +
			"format.")
	public void setTheme(OutputTheme theme) {
		this.theme = theme;
	}

	public int getScale() {
		return scale;
	}

	@Parameter(names = "-scale", placeholder = "1-4", description = "Output image scale. Only for the png output " +
			"format.")
	public void setScale(int scale) {
		if (scale < 0 || scale > 4) {
			throw new ParameterException("Scale must be between 1 and 4, inclusive.");
		}
		this.scale = scale;
	}

	public String getOutputPath() {
		return outputPath;
	}

	@Parameter(names = {"-output", "-o"}, description = "Output path. Set to - for console output.",
			placeholder = "PATH")
	public void setOutputPath(String outputPath) {
		this.outputPath = outputPath;
	}

	public boolean isStandardStream() {
		return CliUtils.isStandardStream(outputPath);
	}

	@Parameters(parametersValidators = OutputOptionsValidator.Refinery.class)
	public static final class Refinery extends OutputOptions {
		public Refinery() {
			setFormat(OutputFormat.REFINERY);
		}
	}

	@Parameters(parametersValidators = OutputOptionsValidator.Json.class)
	public static final class Json extends OutputOptions {
		public Json() {
			setFormat(OutputFormat.JSON);
		}
	}

	@Parameters(parametersValidators = OutputOptionsValidator.Png.class)
	public static final class Png extends OutputOptions {
		public Png() {
			setFormat(OutputFormat.PNG);
		}
	}
}
