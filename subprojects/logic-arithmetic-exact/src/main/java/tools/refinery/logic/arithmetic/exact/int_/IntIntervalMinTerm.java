/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import tools.refinery.logic.substitution.Substitution;
import tools.refinery.logic.term.Term;

public class IntIntervalMinTerm extends IntIntervalBinaryTerm {
	public IntIntervalMinTerm(Term<IntInterval> left, Term<IntInterval> right) {
		super(left, right);
	}

	@Override
	protected IntInterval doEvaluate(IntInterval leftValue, IntInterval rightValue) {
		return leftValue.min(rightValue);
	}

	@Override
	public Term<IntInterval> doSubstitute(Substitution substitution, Term<IntInterval> substitutedLeft,
                                          Term<IntInterval> substitutedRight) {
		return new IntIntervalMinTerm(substitutedLeft, substitutedRight);
	}

	@Override
	public String toString() {
		return "min(%s, %s)".formatted(getLeft(), getRight());
	}
}
