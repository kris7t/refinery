/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.reasoning.term;

import tools.refinery.logic.Constraint;
import tools.refinery.logic.equality.LiteralEqualityHelper;
import tools.refinery.logic.equality.LiteralHashCodeHelper;
import tools.refinery.logic.substitution.Substitution;
import tools.refinery.logic.term.*;

import java.util.*;

// {@link Object#equals(Object)} is implemented by {@link AbstractLiteral}.
@SuppressWarnings("squid:S2160")
public class PartialAggregationTerm<R, T> extends AbstractCallTerm<R> {
	private final PartialAggregator<R, T> partialAggregator;
	private final Term<T> body;

	public PartialAggregationTerm(PartialAggregator<R, T> partialAggregator, Term<T> body, Constraint target,
								  List<Variable> arguments) {
		super(partialAggregator.getResultType(), target, arguments);
		this.partialAggregator = partialAggregator;
		this.body = body;
	}

	@Override
	public Set<Variable> getVariables() {
		var variables = new LinkedHashSet<>(super.getVariables());
		variables.addAll(body.getVariables());
		return Collections.unmodifiableSet(variables);
	}

	@Override
	public Set<Variable> getInputVariables(Set<? extends Variable> positiveVariablesInClause) {
		var positiveVariablesInBody = getPositiveVariablesInBody(positiveVariablesInClause);
		var inputVariables = new LinkedHashSet<>(body.getInputVariables(positiveVariablesInBody));
		// Remove private variables of the call from {@code inputVariables}. Input variables will be added back.
		inputVariables.removeAll(positiveVariablesInBody);
		inputVariables.addAll(super.getInputVariables(positiveVariablesInClause));
		return Collections.unmodifiableSet(inputVariables);
	}

	@Override
	public Set<Variable> getPrivateVariables(Set<? extends Variable> positiveVariablesInClause) {
		var positiveVariablesInBody = getPositiveVariablesInBody(positiveVariablesInClause);
		var privateVariables = new LinkedHashSet<>(body.getPrivateVariables(positiveVariablesInBody));
		privateVariables.addAll(super.getPrivateVariables(positiveVariablesInClause));
		return Collections.unmodifiableSet(privateVariables);
	}

	private Set<Variable> getPositiveVariablesInBody(Set<? extends Variable> positiveVariablesInClause) {
		var positiveVariables = new LinkedHashSet<Variable>(positiveVariablesInClause);
		positiveVariables.addAll(getArgumentsOfDirection(ParameterDirection.OUT));
		return Collections.unmodifiableSet(positiveVariables);
	}

	@Override
	protected Term<R> doSubstitute(Substitution substitution, List<Variable> substitutedArguments) {
		var substitutedBody = body.substitute(substitution);
		return new PartialAggregationTerm<>(partialAggregator, substitutedBody, getTarget(), substitutedArguments);
	}

	@Override
	public Term<R> withArguments(Constraint newTarget, List<Variable> newArguments) {
		return new PartialAggregationTerm<>(partialAggregator, body, newTarget, newArguments);
	}

	@Override
	public boolean equalsWithSubstitution(LiteralEqualityHelper helper, AnyTerm other) {
		if (!super.equalsWithSubstitution(helper, other)) {
			return false;
		}
		var otherPartialAggregationTerm = (PartialAggregationTerm<?, ?>) other;
		return partialAggregator.equals(otherPartialAggregationTerm.partialAggregator) &&
				body.equalsWithSubstitution(helper, otherPartialAggregationTerm.body);
	}

	@Override
	public int hashCodeWithSubstitution(LiteralHashCodeHelper helper) {
		return Objects.hash(super.hashCodeWithSubstitution(helper), partialAggregator,
				body.hashCodeWithSubstitution(helper));
	}

	@Override
	public String toString() {
		var builder = new StringBuilder();
		builder.append("@Partial ");
		builder.append(partialAggregator);
		builder.append(" { ");
		builder.append(body);
		builder.append(" | ");
		builder.append(getTarget().toReferenceString());
		builder.append("(");
		var argumentIterator = getArguments().iterator();
		if (argumentIterator.hasNext()) {
			var argument = argumentIterator.next();
			builder.append(argument);
			while (argumentIterator.hasNext()) {
				builder.append(", ");
				argument = argumentIterator.next();
				builder.append(argument);
			}
		}
		builder.append(") }");
		return builder.toString();
	}
}
