/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term.int_;

import tools.refinery.logic.term.Term;

public class IntPlusTerm extends IntUnaryTerm {
	public IntPlusTerm(Term<Integer> body) {
		super(body);
	}

	@Override
	public Term<Integer> withBody(Term<Integer> newBody) {
		return new IntPlusTerm(newBody);
	}

	@Override
	protected Integer doEvaluate(Integer bodyValue) {
		return bodyValue;
	}

	@Override
	public String toString() {
		return "(+%s)".formatted(getBody());
	}
}
