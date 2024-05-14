/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import tools.refinery.logic.term.BinaryTerm;
import tools.refinery.logic.term.Term;

public abstract class IntIntervalBinaryTerm extends BinaryTerm<IntInterval, IntInterval, IntInterval> {
	protected IntIntervalBinaryTerm(Term<IntInterval> left, Term<IntInterval> right) {
		super(IntInterval.class, IntInterval.class, IntInterval.class, left, right);
	}
}
