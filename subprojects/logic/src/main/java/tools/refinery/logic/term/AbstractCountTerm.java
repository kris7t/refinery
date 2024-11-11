/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term;

import tools.refinery.logic.Constraint;

import java.util.List;

public abstract class AbstractCountTerm<T> extends AbstractCallTerm<T> {
	protected AbstractCountTerm(Class<T> type, Constraint target, List<Variable> arguments) {
		super(type, target, arguments);
	}

	protected abstract String operatorName();

	@Override
	public String toString() {
		var builder = new StringBuilder();
		builder.append(operatorName());
		builder.append(' ');
		builder.append(getTarget().toReferenceString());
		builder.append('(');
		var argumentIterator = getArguments().iterator();
		if (argumentIterator.hasNext()) {
			builder.append(argumentIterator.next());
			while (argumentIterator.hasNext()) {
				builder.append(", ").append(argumentIterator.next());
			}
		}
		builder.append(')');
		return builder.toString();
	}
}
