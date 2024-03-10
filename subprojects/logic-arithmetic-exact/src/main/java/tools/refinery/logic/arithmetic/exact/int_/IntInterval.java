/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import org.apfloat.Apint;
import tools.refinery.logic.AbstractValue;

public sealed interface IntInterval extends AbstractValue<IntInterval, Apint> permits EmptyIntInterval,
		NonEmptyIntInterval {
	boolean isZero();

	default IntInterval plus() {
		return this;
	}

	IntInterval minus();

	IntInterval min(IntInterval other);

	IntInterval max(IntInterval other);

	IntInterval add(IntInterval other);

	IntInterval sub(IntInterval other);

	IntInterval mul(IntInterval other);
}
