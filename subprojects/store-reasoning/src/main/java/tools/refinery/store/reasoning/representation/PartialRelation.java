/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.reasoning.representation;

import tools.refinery.logic.AbstractDomain;
import tools.refinery.logic.Constraint;
import tools.refinery.logic.InvalidQueryException;
import tools.refinery.logic.term.*;
import tools.refinery.logic.term.cardinalityinterval.CardinalityInterval;
import tools.refinery.logic.term.truthvalue.TruthValue;
import tools.refinery.logic.term.truthvalue.TruthValueDomain;
import tools.refinery.store.reasoning.term.PartialCountTerm;

import java.util.Arrays;
import java.util.List;

public record PartialRelation(String name, int arity) implements PartialSymbol<TruthValue, Boolean>, Constraint {
	@Override
	public AbstractDomain<TruthValue, Boolean> abstractDomain() {
		return TruthValueDomain.INSTANCE;
	}

	@Override
	public TruthValue defaultValue() {
		return TruthValue.FALSE;
	}

	@Override
	public List<Parameter> getParameters() {
		var parameters = new Parameter[arity];
		Arrays.fill(parameters, Parameter.NODE_OUT);
		return List.of(parameters);
	}

	@Override
	public String toReferenceString() {
		return name;
	}

	@Override
	public boolean equals(Object o) {
		return this == o;
	}

	@Override
	public int hashCode() {
		// Compare by identity to make hash table look-ups more efficient.
		return System.identityHashCode(this);
	}

	@Override
	public String toString() {
		return "%s/%d".formatted(name, arity);
	}

	public Term<CardinalityInterval> partialCount(List<Variable> arguments) {
		return new PartialCountTerm(this, arguments);
	}

	public Term<CardinalityInterval> partialCount(Variable... arguments) {
		return partialCount(List.of(arguments));
	}

	@Override
	public Term<Integer> count(List<Variable> arguments) {
		throw new InvalidQueryException("Count is not supported for partial symbol " + this);
	}

	@Override
	public <R, T> Term<R> aggregateBy(DataVariable<T> inputVariable, Aggregator<R, T> aggregator, List<Variable> arguments) {
		throw new InvalidQueryException("Aggregation is not supported for partial symbol " + this);
	}

	@Override
	public <T> Term<T> leftJoinBy(DataVariable<T> placeholderVariable, T defaultValue, List<Variable> arguments) {
		throw new InvalidQueryException("Left join is not supported for partial symbol " + this);
	}
}
