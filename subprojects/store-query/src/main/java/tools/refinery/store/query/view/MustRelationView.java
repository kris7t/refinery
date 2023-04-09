/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.query.view;

import tools.refinery.store.representation.Symbol;
import tools.refinery.store.representation.TruthValue;
import tools.refinery.store.tuple.Tuple;

public class MustRelationView extends TuplePreservingRelationView<TruthValue> {
	public MustRelationView(Symbol<TruthValue> symbol) {
		super(symbol, "must");
	}

	@Override
	public boolean filter(Tuple key, TruthValue value) {
		return value.must();
	}
}
