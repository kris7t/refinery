/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.query.term.bool;

public enum LogicBinaryOperator {
	AND("&&"),
	OR("||"),
	XOR("^^");

	private final String text;

	LogicBinaryOperator(String text) {
		this.text = text;
	}

	public String formatString(String left, String right) {
		return "(%s) %s (%s)".formatted(left, text, right);
	}
}
