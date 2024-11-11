/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.reasoning.term;

import tools.refinery.logic.Constraint;
import tools.refinery.logic.term.Term;
import tools.refinery.logic.term.Variable;

import java.util.List;

public interface PartialAggregator<R, T> {
	Class<R> getResultType();

	Class<T> getInputType();

	Term<R> aggregate(Term<T> input, Constraint target, List<Variable> arguments);
}
