/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import org.apfloat.Apcomplex;
import org.apfloat.Apint;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public final class IntIntervals {
	public static final IntInterval EMPTY = EmptyIntInterval.INSTANCE;
	public static final IntInterval ALL = new WideIntInterval(null, null);
	public static final IntInterval ZERO = new SingletonIntInterval(Apcomplex.ZERO);

	private IntIntervals() {
		throw new IllegalArgumentException("This is a static utility class and should not be instantiated directly");
	}

	public static IntInterval exactly(@NotNull Apint value) {
		return new SingletonIntInterval(value);
	}

	public static IntInterval exactly(int value) {
		return exactly(new Apint(value));
	}

	public static IntInterval between(@Nullable Apint lowerBound, @Nullable Apint upperBound) {
		if (lowerBound != null && upperBound != null) {
			int result = lowerBound.compareTo(upperBound);
			if (result > 0) {
				return EMPTY;
			}
			if (result == 0) {
				return new SingletonIntInterval(lowerBound);
			}
		}
		return new WideIntInterval(lowerBound, upperBound);
	}

	public static IntInterval between(int loweBound, int upperBound) {
		return between(new Apint(loweBound), new Apint(upperBound));
	}

	public static IntInterval atMost(@NotNull Apint upperBound) {
		return new WideIntInterval(null, upperBound);
	}

	public static IntInterval atMost(int upperBound) {
		return atMost(new Apint(upperBound));
	}

	public static IntInterval atLeast(@NotNull Apint lowerBound) {
		return new WideIntInterval(lowerBound, null);
	}

	public static IntInterval atLeast(int lowerBound) {
		return atLeast(new Apint(lowerBound));
	}
}
