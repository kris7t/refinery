/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term.real;

import tools.refinery.logic.term.Term;

public class RealMaxTerm extends RealBinaryTerm {
	public RealMaxTerm(Term<Double> left, Term<Double> right) {
		super(left, right);
	}

	@Override
	public Term<Double> withSubTerms(Term<Double> newLeft,
									 Term<Double> newRight) {
		return new RealMaxTerm(newLeft, newRight);
	}

	@Override
	protected Double doEvaluate(Double leftValue, Double rightValue) {
		return Math.max(leftValue, rightValue);
	}

	@Override
	public String toString() {
		return "max(%s, %s)".formatted(getLeft(), getRight());
	}
}
