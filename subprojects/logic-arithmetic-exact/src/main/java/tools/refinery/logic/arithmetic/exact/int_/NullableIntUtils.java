/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import org.apfloat.Apint;
import org.apfloat.ApintMath;
import org.jetbrains.annotations.Nullable;

class NullableIntUtils {
	private NullableIntUtils() {
		throw new IllegalArgumentException("This is a static utility class and should not be instantiated directly");
	}

	public static Apint add(@Nullable Apint a, @Nullable Apint b) {
		if (a == null || b == null) {
			return null;
		}
		return a.add(b);
	}

	public static Apint sub(@Nullable Apint a, @Nullable Apint b) {
		if (a == null || b == null) {
			return null;
		}
		return a.subtract(b);
	}

	public static Apint mul(@Nullable Apint a, @Nullable Apint b) {
		if (a == null || b == null) {
			return null;
		}
		return a.multiply(b);
	}

	public static Apint minNullIsNegativeInfinity(@Nullable Apint a, @Nullable Apint b) {
		if (a == null || b == null) {
			return null;
		}
		return ApintMath.min(a, b);
	}

	public static Apint minNullIsPositiveInfinity(@Nullable Apint a, @Nullable Apint b) {
		if (a == null) {
			return b;
		}
		if (b == null) {
			return a;
		}
		return ApintMath.min(a, b);
	}

	public static Apint maxNullIsNegativeInfinity(@Nullable Apint a, @Nullable Apint b) {
		if (a == null) {
			return b;
		}
		if (b == null) {
			return a;
		}
		return ApintMath.max(a, b);
	}

	public static Apint maxNullIsPositiveInfinity(@Nullable Apint a, @Nullable Apint b) {
		if (a == null || b == null) {
			return null;
		}
		return ApintMath.max(a, b);
	}

	public static boolean lessThanOrEqualsNullIsPositiveInfinity(@Nullable Apint a, @Nullable Apint b) {
		return b == null || (a != null && a.compareTo(b) <= 0);
	}

	public static boolean greaterThanOrEqualsNullIsNegativeInfinity(@Nullable Apint a, @Nullable Apint b) {
		return b == null || (a != null && a.compareTo(b) >= 0);
	}
}
