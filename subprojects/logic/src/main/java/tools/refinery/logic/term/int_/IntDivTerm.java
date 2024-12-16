/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term.int_;

import tools.refinery.logic.term.Term;

public class IntDivTerm extends IntBinaryTerm {
	public IntDivTerm(Term<Integer> left, Term<Integer> right) {
		super(left, right);
	}

	@Override
	public Term<Integer> withSubTerms(Term<Integer> newLeft,
									  Term<Integer> newRight) {
		return new IntDivTerm(newLeft, newRight);
	}

	@Override
	protected Integer doEvaluate(Integer leftValue, Integer rightValue) {
		return rightValue == 0 ? null : leftValue / rightValue;
	}

	@Override
	public String toString() {
		return "(%s / %s)".formatted(getLeft(), getRight());
	}
}
