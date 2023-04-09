/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.reasoning;

import tools.refinery.store.adapter.ModelAdapter;
import tools.refinery.store.reasoning.representation.AnyPartialSymbol;
import tools.refinery.store.reasoning.representation.PartialSymbol;
import tools.refinery.store.query.dnf.Dnf;
import tools.refinery.store.query.ResultSet;

public interface ReasoningAdapter extends ModelAdapter {
	@Override
	ReasoningStoreAdapter getStoreAdapter();

	default AnyPartialInterpretation getPartialInterpretation(AnyPartialSymbol partialSymbol) {
		// Cast to disambiguate overloads.
		var typedPartialSymbol = (PartialSymbol<?, ?>) partialSymbol;
		return getPartialInterpretation(typedPartialSymbol);
	}

	<A, C> PartialInterpretation<A, C> getPartialInterpretation(PartialSymbol<A, C> partialSymbol);

	ResultSet getLiftedResultSet(Dnf query);
}
