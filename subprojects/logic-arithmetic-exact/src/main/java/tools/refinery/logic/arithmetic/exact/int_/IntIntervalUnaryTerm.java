/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import tools.refinery.logic.term.Term;
import tools.refinery.logic.term.UnaryTerm;

public abstract class IntIntervalUnaryTerm extends UnaryTerm<IntInterval, IntInterval> {
	protected IntIntervalUnaryTerm(Term<IntInterval> body) {
		super(IntInterval.class, IntInterval.class, body);
	}
}
