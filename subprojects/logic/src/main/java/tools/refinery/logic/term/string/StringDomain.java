/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term.string;

import tools.refinery.logic.term.lifted.LiftedDomain;

public final class StringDomain {
	public static final LiftedDomain<String> INSTANCE = new LiftedDomain<>(String.class, "");

	private StringDomain() {
		throw new IllegalArgumentException("This is a static utility class and should not be instantiated directly");
	}
}
