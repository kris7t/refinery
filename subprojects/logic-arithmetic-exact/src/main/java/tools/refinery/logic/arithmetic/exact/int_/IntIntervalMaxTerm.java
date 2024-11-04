/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import tools.refinery.logic.term.Term;

public class IntIntervalMaxTerm extends IntIntervalBinaryTerm {
	public IntIntervalMaxTerm(Term<IntInterval> left, Term<IntInterval> right) {
		super(left, right);
	}

	@Override
	protected IntInterval doEvaluate(IntInterval leftValue, IntInterval rightValue) {
		return leftValue.max(rightValue);
	}

	@Override
	public Term<IntInterval> withSubTerms(Term<IntInterval> newLeft,
										  Term<IntInterval> newRight) {
		return new IntIntervalMaxTerm(newLeft, newRight);
	}

	@Override
	public String toString() {
		return "max(%s, %s)".formatted(getLeft(), getRight());
	}
}
