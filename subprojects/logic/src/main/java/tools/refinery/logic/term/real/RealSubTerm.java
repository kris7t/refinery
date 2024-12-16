/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term.real;

import tools.refinery.logic.term.Term;

public class RealSubTerm extends RealBinaryTerm {
	public RealSubTerm(Term<Double> left, Term<Double> right) {
		super(left, right);
	}

	@Override
	public Term<Double> withSubTerms(Term<Double> newLeft,
									 Term<Double> newRight) {
		return new RealSubTerm(newLeft, newRight);
	}

	@Override
	protected Double doEvaluate(Double leftValue, Double rightValue) {
		return leftValue - rightValue;
	}

	@Override
	public String toString() {
		return "(%s - %s)".formatted(getLeft(), getRight());
	}
}
