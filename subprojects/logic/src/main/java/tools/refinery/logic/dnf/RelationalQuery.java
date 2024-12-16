/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.dnf;

import tools.refinery.logic.InvalidQueryException;
import tools.refinery.logic.literal.CallLiteral;
import tools.refinery.logic.literal.CallPolarity;
import tools.refinery.logic.term.NodeVariable;
import tools.refinery.logic.term.Term;

import java.util.Collections;
import java.util.List;

public final class RelationalQuery extends Query<Boolean> {
	RelationalQuery(Dnf dnf) {
		super(dnf);
		for (var parameter : dnf.getSymbolicParameters()) {
			var parameterType = parameter.tryGetType();
			if (parameterType.isPresent()) {
				throw new InvalidQueryException("Expected parameter %s of %s to be a node variable, got %s instead"
						.formatted(parameter, dnf, parameterType.get().getName()));
			}
		}
	}

	@Override
	public int arity() {
		return getDnf().arity();
	}

	@Override
	public Class<Boolean> valueType() {
		return Boolean.class;
	}

	@Override
	public Boolean defaultValue() {
		return false;
	}

	@Override
	protected RelationalQuery withDnfInternal(Dnf newDnf) {
		return newDnf.asRelation();
	}

	@Override
	public RelationalQuery withDnf(Dnf newDnf) {
		return (RelationalQuery) super.withDnf(newDnf);
	}

	public CallLiteral call(CallPolarity polarity, List<NodeVariable> arguments) {
		return getDnf().call(polarity, Collections.unmodifiableList(arguments));
	}

	public CallLiteral call(CallPolarity polarity, NodeVariable... arguments) {
		return getDnf().call(polarity, arguments);
	}

	public CallLiteral call(NodeVariable... arguments) {
		return getDnf().call(arguments);
	}

	public CallLiteral callTransitive(NodeVariable left, NodeVariable right) {
		return getDnf().callTransitive(left, right);
	}

	public Term<Integer> count(List<NodeVariable> arguments) {
		return getDnf().count(Collections.unmodifiableList(arguments));
	}

	public Term<Integer> count(NodeVariable... arguments) {
		return getDnf().count(arguments);
	}
}
