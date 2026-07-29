/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
package tools.refinery.generator.cli;

import com.beust.jcommander.JCommander;
import com.beust.jcommander.ParameterDescription;
import tools.refinery.generator.cli.jcommander.FilteredUsageFormatter;
import tools.refinery.generator.cli.output.OutputFormat;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;

class RefineryUsageFormatter extends FilteredUsageFormatter {
	private static final Set<String> OPTIONS_TO_HIDE = Set.of("-transparent", "-embed-fonts", "-theme", "-scale");

	private final boolean hideGraphicalOutput;

	public RefineryUsageFormatter(JCommander commander, boolean hideGraphicalOutput) {
		super(commander);
		this.hideGraphicalOutput = hideGraphicalOutput;
	}

	@Override
	protected boolean isHidden(ParameterDescription parameterDescription) {
		return hideGraphicalOutput && Arrays.stream(parameterDescription.getParameter().names())
				.anyMatch(OPTIONS_TO_HIDE::contains);
	}

	@Override
	protected <E extends Enum<E>> EnumSet<E> getPossibleValues(Class<E> type) {
		if (hideGraphicalOutput && OutputFormat.class.equals(type)) {
			// We just checked that this cast is valid.
			@SuppressWarnings("unchecked")
			var result = (EnumSet<E>) getPossibleOutputFormatValues();
			return result;
		}
		return super.getPossibleValues(type);
	}

	private EnumSet<OutputFormat> getPossibleOutputFormatValues() {
		return EnumSet.copyOf(Arrays.stream(OutputFormat.values())
				.filter(format -> !format.isRendererNeeded())
				.toList());
	}
}
