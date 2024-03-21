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

public record WideIntInterval(@Nullable Apint lowerBound, @Nullable Apint upperBound) implements NonEmptyIntInterval {
	public WideIntInterval {
		if (lowerBound != null && upperBound != null && lowerBound.compareTo(upperBound) >= 0) {
			throw new IllegalArgumentException("Expected lowerBound to be less than upperBound");
		}
	}

	@Override
	@Nullable
	public Apint getConcrete() {
		return null;
	}

	@Override
	@NotNull
	public Apint getArbitrary() {
		if (lowerBound == null) {
            return upperBound == null ? Apcomplex.ZERO : upperBound;
        }
		return lowerBound;
	}

	@Override
	public boolean isZero() {
		return false;
	}

	@Override
	public IntInterval minus() {
		var negatedUpperBound = upperBound == null ? null : upperBound.negate();
		var negatedLowerBound = lowerBound == null ? null : lowerBound.negate();
		return new WideIntInterval(negatedUpperBound, negatedLowerBound);
	}

	@Override
	public String toString() {
		if (lowerBound == null && upperBound == null) {
			return "unknown";
		}
		var builder = new StringBuilder();
		appendBound(builder, lowerBound);
		builder.append("..");
		appendBound(builder, upperBound);
		return builder.toString();
	}

	private static void appendBound(StringBuilder builder, Apint value) {
		if (value == null) {
			builder.append("*");
		} else {
			builder.append(value);
		}
	}
}
