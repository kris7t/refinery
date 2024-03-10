/*
 * Copyright (c) 2000 Timothy J. Hickey
 * Copyright (c) 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: Zlib AND EPL-2.0
 *
 * Some algorithms used in this file are based on ia_math 0.0 by Timothy J. Hickey, which was made available at
 * https://interval.sourceforge.net/interval/ on 2002-03-30 under the zlib/png license. We adapter the algorithms for
 * arbitrary-precision integer arithmetic instead of double arithmetic and for our own interval representation.
 */
package tools.refinery.logic.arithmetic.exact.int_;

import org.apfloat.Apint;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public sealed interface NonEmptyIntInterval extends IntInterval permits SingletonIntInterval, WideIntInterval {
	/**
	 * The lower bound of this interval or {@code null} if this interval is (half-)open towards negative infinity.
	 *
	 * @return The lower bound or {@code null}.
	 */
	@Nullable Apint lowerBound();

	/**
	 * The upper bound of this interval or {@code null} if this interval is (half-)open towards positive infinity.
	 *
	 * @return The upper bound or {@code null}.
	 */
	@Nullable Apint upperBound();

	@Override
	@NotNull
	Apint getArbitrary();

	@Override
	default boolean isError() {
		return false;
	}

	@Override
	default IntInterval join(IntInterval other) {
		if (!(other instanceof NonEmptyIntInterval nonEmptyOther)) {
			return this;
		}
		return IntIntervals.between(
				NullableIntUtils.minNullIsNegativeInfinity(lowerBound(), nonEmptyOther.lowerBound()),
				NullableIntUtils.maxNullIsPositiveInfinity(upperBound(), nonEmptyOther.upperBound()));
	}

	@Override
	default IntInterval meet(IntInterval other) {
		if (!(other instanceof NonEmptyIntInterval nonEmptyOther)) {
			return IntIntervals.EMPTY;
		}
		return IntIntervals.between(
				NullableIntUtils.maxNullIsNegativeInfinity(lowerBound(), nonEmptyOther.lowerBound()),
				NullableIntUtils.minNullIsPositiveInfinity(upperBound(), nonEmptyOther.upperBound()));
	}

	@Override
	default boolean isRefinementOf(IntInterval other) {
		if (!(other instanceof NonEmptyIntInterval nonEmptyOther)) {
			return false;
		}
		return NullableIntUtils.greaterThanOrEqualsNullIsNegativeInfinity(lowerBound(), nonEmptyOther.lowerBound()) &&
				NullableIntUtils.lessThanOrEqualsNullIsPositiveInfinity(upperBound(), nonEmptyOther.upperBound());
	}

	@Override
	default IntInterval min(IntInterval other) {
		if (!(other instanceof NonEmptyIntInterval nonEmptyOther)) {
			return IntIntervals.EMPTY;
		}
		return IntIntervals.between(
				NullableIntUtils.minNullIsNegativeInfinity(lowerBound(), nonEmptyOther.lowerBound()),
				NullableIntUtils.minNullIsPositiveInfinity(upperBound(), nonEmptyOther.upperBound()));
	}

	@Override
	default IntInterval max(IntInterval other) {
		if (!(other instanceof NonEmptyIntInterval nonEmptyOther)) {
			return IntIntervals.EMPTY;
		}
		return IntIntervals.between(
				NullableIntUtils.maxNullIsNegativeInfinity(lowerBound(), nonEmptyOther.lowerBound()),
				NullableIntUtils.maxNullIsPositiveInfinity(upperBound(), nonEmptyOther.upperBound()));
	}

	@Override
	default IntInterval add(IntInterval other) {
		if (!(other instanceof NonEmptyIntInterval nonEmptyOther)) {
			return IntIntervals.EMPTY;
		}
		return IntIntervals.between(NullableIntUtils.add(lowerBound(), nonEmptyOther.lowerBound()),
				NullableIntUtils.add(upperBound(), nonEmptyOther.upperBound()));
	}

	@Override
	default IntInterval sub(IntInterval other) {
		if (!(other instanceof NonEmptyIntInterval nonEmptyOther)) {
			return IntIntervals.EMPTY;
		}
		return IntIntervals.between(NullableIntUtils.sub(lowerBound(), nonEmptyOther.upperBound()),
				NullableIntUtils.sub(upperBound(), nonEmptyOther.lowerBound()));
	}

	// High-complexity method kept to directly follow {@code net.sourceforge.interval.ia_math.IAMath#mul}.
	@SuppressWarnings("squid:S3776")
	@Override
	default IntInterval mul(IntInterval other) {
		if (!(other instanceof NonEmptyIntInterval nonEmptyOther)) {
			return IntIntervals.EMPTY;
		}
		if (isZero() || other.isZero()) {
			return IntIntervals.ZERO;
		}
		var lowerBound = lowerBound();
		var upperBound = upperBound();
		var otherLowerBound = nonEmptyOther.lowerBound();
		var otherUpperBound = nonEmptyOther.upperBound();
		if (lowerBound != null && lowerBound.signum() >= 0) {
			if (otherLowerBound != null && otherLowerBound.signum() >= 0) {
				return IntIntervals.between(lowerBound.multiply(otherLowerBound),
						NullableIntUtils.mul(upperBound, otherUpperBound));
			}
			if (otherUpperBound != null && otherUpperBound.signum() <= 0) {
				return IntIntervals.between(NullableIntUtils.mul(upperBound, otherLowerBound),
						lowerBound.multiply(otherUpperBound));
			}
			return IntIntervals.between(NullableIntUtils.mul(upperBound, otherLowerBound),
					NullableIntUtils.mul(upperBound, otherUpperBound));
		}
		if (upperBound != null && upperBound.signum() <= 0) {
			if (otherLowerBound != null && otherLowerBound.signum() >= 0) {
				return IntIntervals.between(NullableIntUtils.mul(lowerBound, otherLowerBound),
						upperBound.multiply(otherLowerBound));
			}
			if (otherUpperBound != null && otherUpperBound.signum() <= 0) {
				return IntIntervals.between(upperBound.multiply(otherUpperBound),
						NullableIntUtils.mul(lowerBound, otherLowerBound));
			}
			return IntIntervals.between(NullableIntUtils.mul(lowerBound, otherUpperBound),
					NullableIntUtils.mul(lowerBound, otherLowerBound));
		}
		if (otherLowerBound != null && otherLowerBound.signum() >= 0) {
			return IntIntervals.between(NullableIntUtils.mul(lowerBound, otherUpperBound),
					NullableIntUtils.mul(upperBound, otherUpperBound));
		}
		if (otherUpperBound != null && otherUpperBound.signum() <= 0) {
			return IntIntervals.between(NullableIntUtils.mul(upperBound, otherLowerBound),
					NullableIntUtils.mul(lowerBound, otherLowerBound));
		}
		var newLowerBound = NullableIntUtils.minNullIsNegativeInfinity(
				NullableIntUtils.mul(upperBound, otherLowerBound),
				NullableIntUtils.mul(lowerBound, otherUpperBound));
		var newUpperBound = NullableIntUtils.maxNullIsPositiveInfinity(
				NullableIntUtils.mul(lowerBound, otherLowerBound),
				NullableIntUtils.mul(upperBound, otherUpperBound));
		return IntIntervals.between(newLowerBound, newUpperBound);
	}
}
