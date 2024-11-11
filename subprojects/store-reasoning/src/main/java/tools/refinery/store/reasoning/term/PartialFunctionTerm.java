/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.reasoning.term;

import tools.refinery.logic.AbstractValue;
import tools.refinery.logic.InvalidQueryException;
import tools.refinery.logic.equality.LiteralEqualityHelper;
import tools.refinery.logic.equality.LiteralHashCodeHelper;
import tools.refinery.logic.rewriter.TermRewriter;
import tools.refinery.logic.substitution.Substitution;
import tools.refinery.logic.term.*;
import tools.refinery.logic.valuation.Valuation;
import tools.refinery.store.reasoning.representation.PartialFunction;

import java.util.List;
import java.util.Set;

// {@link Object#equals(Object)} is implemented by {@link AbstractTerm}.
@SuppressWarnings("squid:S2160")
public class PartialFunctionTerm<A extends AbstractValue<A, C>, C> extends AbstractTerm<A> {
	private final PartialFunction<A, C> target;
	private final List<NodeVariable> arguments;

	public PartialFunctionTerm(PartialFunction<A, C> target, List<NodeVariable> arguments) {
		super(target.abstractDomain().abstractType());
		int arity = target.arity();
		if (arguments.size() != arity) {
			throw new InvalidQueryException("%s needs %d arguments, but got %s".formatted(target.name(),
					target.arity(), arguments.size()));
		}
		this.target = target;
		this.arguments = arguments;
	}

	public PartialFunction<A, C> getTarget() {
		return target;
	}

	public List<NodeVariable> getArguments() {
		return arguments;
	}

	@Override
	public A evaluate(Valuation valuation) {
		throw new IllegalStateException("Partial function term %s cannot be evaluated directly.".formatted(this));
	}

	@Override
	public Term<A> rewriteSubTerms(TermRewriter termRewriter) {
		// No sub-terms to rewrite.
		return this;
	}

	@Override
	public Term<A> substitute(Substitution substitution) {
		var substitutedArguments = arguments.stream()
				.map(substitution::getTypeSafeSubstitute)
				.toList();
		return new PartialFunctionTerm<>(target, substitutedArguments);
	}

	@Override
	public Set<Variable> getVariables() {
		return Set.copyOf(arguments);
	}

	@Override
	public Set<Variable> getInputVariables(Set<? extends Variable> positiveVariablesInClause) {
		return getVariables();
	}

	@Override
	public boolean equalsWithSubstitution(LiteralEqualityHelper helper, AnyTerm other) {
		if (!super.equalsWithSubstitution(helper, other)) {
			return false;
		}
		var otherPartialFunctionTerm = (PartialFunctionTerm<?, ?>) other;
		var arity = arguments.size();
		if (arity != otherPartialFunctionTerm.arguments.size()) {
			return false;
		}
		for (int i = 0; i < arity; i++) {
			if (!helper.variableEqual(arguments.get(i), otherPartialFunctionTerm.arguments.get(i))) {
				return false;
			}
		}
		return target.equals(otherPartialFunctionTerm.target);
	}

	@Override
	public int hashCodeWithSubstitution(LiteralHashCodeHelper helper) {
		int result = super.hashCodeWithSubstitution(helper) * 31 + target.hashCode();
		for (var argument : arguments) {
			result = result * 31 + helper.getVariableHashCode(argument);
		}
		return result;
	}

	@Override
	public String toString() {
		var builder = new StringBuilder();
		builder.append("@Partial ");
		builder.append(target.name());
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
