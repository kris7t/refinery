/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.reasoning.term;

import tools.refinery.logic.Constraint;
import tools.refinery.logic.substitution.Substitution;
import tools.refinery.logic.term.AbstractCountTerm;
import tools.refinery.logic.term.Term;
import tools.refinery.logic.term.Variable;
import tools.refinery.logic.term.cardinalityinterval.CardinalityInterval;

import java.util.List;

public class PartialCountTerm extends AbstractCountTerm<CardinalityInterval> {
	public PartialCountTerm(Constraint target, List<Variable> arguments) {
		super(CardinalityInterval.class, target, arguments);
	}

	@Override
	protected Term<CardinalityInterval> doSubstitute(Substitution substitution, List<Variable> substitutedArguments) {
		return new PartialCountTerm(getTarget(), substitutedArguments);
	}

	@Override
	public Term<CardinalityInterval> withArguments(Constraint newTarget, List<Variable> newArguments) {
		return new PartialCountTerm(newTarget, newArguments);
	}

	@Override
	protected String operatorName() {
		return "@Partial count";
	}
}
