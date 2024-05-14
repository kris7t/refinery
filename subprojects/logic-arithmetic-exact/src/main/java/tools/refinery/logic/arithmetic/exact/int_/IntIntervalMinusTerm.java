/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import tools.refinery.logic.substitution.Substitution;
import tools.refinery.logic.term.Term;

public class IntIntervalMinusTerm extends IntIntervalUnaryTerm {
	protected IntIntervalMinusTerm(Term<IntInterval> body) {
		super(body);
	}

	@Override
	protected IntInterval doEvaluate(IntInterval bodyValue) {
		return bodyValue.minus();
	}

	@Override
	protected Term<IntInterval> doSubstitute(Substitution substitution, Term<IntInterval> substitutedBody) {
		return new IntIntervalMinusTerm(substitutedBody);
	}

	@Override
	public String toString() {
		return "(-%s)".formatted(getBody());
	}
}
