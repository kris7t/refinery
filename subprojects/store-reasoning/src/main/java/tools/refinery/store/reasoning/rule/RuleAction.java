/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.reasoning.rule;

import tools.refinery.store.model.Model;
import tools.refinery.store.query.term.Variable;

import java.util.List;

public interface RuleAction {
	List<Variable> arguments();

	RuleActionExecutor createExecutor(int[] argumentIndices, Model model);
}
