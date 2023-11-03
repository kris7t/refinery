/*
 * SPDX-FileCopyrightText: 2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.generator;

import tools.refinery.store.dse.propagation.PropagationAdapter;
import tools.refinery.store.dse.transition.DesignSpaceExplorationAdapter;
import tools.refinery.store.model.ModelStore;
import tools.refinery.store.reasoning.ReasoningAdapter;
import tools.refinery.store.reasoning.literal.Concreteness;
import tools.refinery.store.statecoding.StateCoderAdapter;

import java.util.Set;

public final class ModelGeneratorBuilder extends AbstractRefineryBuilder<ModelGeneratorBuilder> {
	public ModelGeneratorBuilder() {
		super(Set.of(Concreteness.CANDIDATE));
	}

	@Override
	protected ModelGeneratorBuilder self() {
		return this;
	}

	public ModelGenerator build() {
		checkProblem();
		var storeBuilder = ModelStore.builder()
				.cancellationToken(cancellationToken)
				.with(getQueryEngineBuilder())
				.with(PropagationAdapter.builder())
				.with(StateCoderAdapter.builder())
				.with(DesignSpaceExplorationAdapter.builder())
				.with(ReasoningAdapter.builder()
						.requiredInterpretations(requiredInterpretations));
		initializer.configureStoreBuilder(storeBuilder);
		var store = storeBuilder.build();
		return new ModelGenerator(getProblemTrace(), store, initializer.getModelSeed());
	}
}
