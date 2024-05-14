/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import tools.refinery.logic.term.Term;

public final class IntIntervalTerms {
	private IntIntervalTerms() {
		throw new IllegalArgumentException("This is a static utility class and should not be instantiated directly");
	}

	public static Term<IntInterval> plus(Term<IntInterval> body) {
		return new IntIntervalPlusTerm(body);
	}

	public static Term<IntInterval> minus(Term<IntInterval> body) {
		return new IntIntervalMinusTerm(body);
	}

	public static Term<IntInterval> add(Term<IntInterval> left, Term<IntInterval> right) {
		return new IntIntervalAddTerm(left, right);
	}

	public static Term<IntInterval> sub(Term<IntInterval> left, Term<IntInterval> right) {
		return new IntIntervalSubTerm(left, right);
	}

	public static Term<IntInterval> mul(Term<IntInterval> left, Term<IntInterval> right) {
		return new IntIntervalMulTerm(left, right);
	}

	public static Term<IntInterval> min(Term<IntInterval> left, Term<IntInterval> right) {
		return new IntIntervalMinTerm(left, right);
	}

	public static Term<IntInterval> max(Term<IntInterval> left, Term<IntInterval> right) {
		return new IntIntervalMaxTerm(left, right);
	}
}
