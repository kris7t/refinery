/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import org.apfloat.Apint;
import tools.refinery.logic.AbstractDomain;

// Singleton pattern, because there is only one domain for integer intervals.
@SuppressWarnings("squid:S6548")
public class IntIntervalDomain implements AbstractDomain<IntInterval, Apint> {
	public static final IntIntervalDomain INSTANCE = new IntIntervalDomain();

	private IntIntervalDomain() {
	}

	@Override
	public Class<IntInterval> abstractType() {
		return IntInterval.class;
	}

	@Override
	public Class<Apint> concreteType() {
		return Apint.class;
	}

	@Override
	public IntInterval unknown() {
		return IntIntervals.ALL;
	}

	@Override
	public IntInterval error() {
		return IntIntervals.EMPTY;
	}

	@Override
	public IntInterval toAbstract(Apint concreteValue) {
		return IntIntervals.exactly(concreteValue);
	}
}
