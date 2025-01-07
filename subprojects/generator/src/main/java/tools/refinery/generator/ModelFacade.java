/*
 * SPDX-FileCopyrightText: 2023-2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.generator;

import tools.refinery.language.model.problem.Problem;
import tools.refinery.language.semantics.ProblemTrace;
import tools.refinery.language.semantics.metadata.NodesMetadata;
import tools.refinery.language.semantics.metadata.RelationMetadata;
import tools.refinery.logic.AbstractValue;
import tools.refinery.store.model.Model;
import tools.refinery.store.model.ModelStore;
import tools.refinery.store.reasoning.interpretation.AnyPartialInterpretation;
import tools.refinery.store.reasoning.interpretation.PartialInterpretation;
import tools.refinery.store.reasoning.literal.Concreteness;
import tools.refinery.store.reasoning.representation.AnyPartialSymbol;
import tools.refinery.store.reasoning.representation.PartialSymbol;

import java.util.List;
import java.util.Optional;

public interface ModelFacade {
	ProblemTrace getProblemTrace();

	ModelStore getModelStore();

	Model getModel();

	ModelFacadeResult getInitializationResult();

	void throwIfInitializationFailed();

	Concreteness getConcreteness();

	default AnyPartialInterpretation getPartialInterpretation(AnyPartialSymbol partialSymbol) {
		var typedPartialSymbol = (PartialSymbol<?, ?>) partialSymbol;
		return getPartialInterpretation(typedPartialSymbol);
	}

	<A extends AbstractValue<A, C>, C> PartialInterpretation<A, C> getPartialInterpretation(
			PartialSymbol<A, C> partialSymbol);

	NodesMetadata getNodesMetadata();

	List<RelationMetadata> getRelationsMetadata();

	ConsistencyCheckResult checkConsistency();

	Problem serialize();

	Optional<Problem> trySerialize();
}
