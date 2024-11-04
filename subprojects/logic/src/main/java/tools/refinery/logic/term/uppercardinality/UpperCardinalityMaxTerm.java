/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term.uppercardinality;

import tools.refinery.logic.term.Term;

public class UpperCardinalityMaxTerm extends UpperCardinalityBinaryTerm {
	protected UpperCardinalityMaxTerm(Term<UpperCardinality> left, Term<UpperCardinality> right) {
		super(left, right);
	}

	@Override
	protected UpperCardinality doEvaluate(UpperCardinality leftValue, UpperCardinality rightValue) {
		return leftValue.max(rightValue);
	}

	@Override
	public Term<UpperCardinality> withSubTerms(Term<UpperCardinality> newLeft, Term<UpperCardinality> newRight) {
		return new UpperCardinalityMaxTerm(newLeft, newRight);
	}

	@Override
	public String toString() {
		return "max(%s, %s)".formatted(getLeft(), getRight());
	}
}
