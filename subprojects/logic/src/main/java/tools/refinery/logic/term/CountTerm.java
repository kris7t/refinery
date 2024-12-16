/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term;

import tools.refinery.logic.Constraint;
import tools.refinery.logic.substitution.Substitution;

import java.util.List;

public class CountTerm extends AbstractCountTerm<Integer> {
	public CountTerm(Constraint target, List<Variable> arguments) {
		super(Integer.class, target, arguments);
	}

	@Override
	protected Term<Integer> doSubstitute(Substitution substitution, List<Variable> substitutedArguments) {
		return new CountTerm(getTarget(), substitutedArguments);
	}

	@Override
	public Term<Integer> withArguments(Constraint newTarget, List<Variable> newArguments) {
		return new CountTerm(newTarget, newArguments);
	}

	@Override
	protected String operatorName() {
		return "count";
	}
}
