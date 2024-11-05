/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import tools.refinery.logic.term.Term;

public class IntIntervalPlusTerm extends IntIntervalUnaryTerm {
	protected IntIntervalPlusTerm(Term<IntInterval> body) {
		super(body);
	}

	@Override
	protected IntInterval doEvaluate(IntInterval bodyValue) {
		return bodyValue.plus();
	}

	@Override
	protected Term<IntInterval> constructWithBody(Term<IntInterval> newBody) {
		return new IntIntervalPlusTerm(newBody);
	}

	@Override
	public String toString() {
		return "(+%s)".formatted(getBody());
	}
}
