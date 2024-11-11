/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.reasoning.term;

import tools.refinery.logic.equality.LiteralEqualityHelper;
import tools.refinery.logic.equality.LiteralHashCodeHelper;
import tools.refinery.logic.term.AnyTerm;
import tools.refinery.logic.term.Term;
import tools.refinery.logic.term.UnaryTerm;
import tools.refinery.store.reasoning.literal.Concreteness;

import java.util.Locale;

// {@link Object#equals(Object)} is implemented by {@link AbstractLiteral}.
@SuppressWarnings("squid:S2160")
public class ConcreteTerm<T> extends UnaryTerm<T, T> {
	private final Concreteness concreteness;

	protected ConcreteTerm(Concreteness concreteness, Term<T> body) {
		super(body.getType(), body.getType(), body);
		this.concreteness = concreteness;
	}

	public Concreteness getConcreteness() {
		return concreteness;
	}

	@Override
	protected T doEvaluate(T bodyValue) {
		// If the body could be evaluated, it is independent of the concreteness.
		return bodyValue;
	}

	@Override
	protected Term<T> constructWithBody(Term<T> newBody) {
		return new ConcreteTerm<>(concreteness, newBody);
	}

	@Override
	public boolean equalsWithSubstitution(LiteralEqualityHelper helper, AnyTerm other) {
		if (!super.equalsWithSubstitution(helper, other)) {
			return false;
		}
		var otherConcreteTerm = (ConcreteTerm<?>) other;
		return concreteness.equals(otherConcreteTerm.concreteness);
	}

	@Override
	public int hashCodeWithSubstitution(LiteralHashCodeHelper helper) {
		return super.hashCodeWithSubstitution(helper) * 31 + concreteness.hashCode();
	}

	@Override
	public String toString() {
		return "(%s %s)".formatted(concreteness.name().toLowerCase(Locale.ROOT), getBody());
	}
}
