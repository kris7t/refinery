/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import org.apfloat.Apint;
import org.apfloat.ApintMath;
import org.jetbrains.annotations.NotNull;

public record SingletonIntInterval(@NotNull Apint singleValue) implements NonEmptyIntInterval {
	@Override
	@NotNull
	public Apint getConcrete() {
		return singleValue;
	}

	@Override
	public boolean isConcrete() {
		return true;
	}

	@Override
	@NotNull
	public Apint getArbitrary() {
		return getConcrete();
	}

	@Override
	public IntInterval join(IntInterval other) {
		if (other instanceof SingletonIntInterval(var otherSingleValue)) {
			int result = singleValue.compareTo(otherSingleValue);
			if (result < 0) {
				return IntIntervals.between(singleValue, otherSingleValue);
			}
			if (result == 0) {
				return this;
			}
			return IntIntervals.between(otherSingleValue, singleValue);
		}
		return NonEmptyIntInterval.super.join(other);
	}

	@Override
	public IntInterval meet(IntInterval other) {
		if (other instanceof SingletonIntInterval) {
            return this.equals(other) ? this : IntIntervals.EMPTY;
        }
		return NonEmptyIntInterval.super.meet(other);
	}

	@Override
	public boolean isRefinementOf(IntInterval other) {
		if (other instanceof SingletonIntInterval) {
			return this.equals(other);
		}
		return NonEmptyIntInterval.super.isRefinementOf(other);
	}

	@Override
	@NotNull
	public Apint lowerBound() {
		return singleValue;
	}

	@Override
	@NotNull
	public Apint upperBound() {
		return singleValue;
	}

	@Override
	public boolean isZero() {
		return singleValue.isZero();
	}

	@Override
	public IntInterval minus() {
		return IntIntervals.exactly(singleValue.negate());
	}

	@Override
	public IntInterval min(IntInterval other) {
		if (other instanceof SingletonIntInterval(var otherSingleValue)) {
			return IntIntervals.exactly(ApintMath.min(singleValue, otherSingleValue));
		}
		return NonEmptyIntInterval.super.min(other);
	}

	@Override
	public IntInterval max(IntInterval other) {
		if (other instanceof SingletonIntInterval(var otherSingleValue)) {
			return IntIntervals.exactly(ApintMath.max(singleValue, otherSingleValue));
		}
		return NonEmptyIntInterval.super.max(other);
	}

	@Override
	public IntInterval add(IntInterval other) {
		if (other instanceof SingletonIntInterval(var otherSingleValue)) {
			return IntIntervals.exactly(singleValue.add(otherSingleValue));
		}
		return NonEmptyIntInterval.super.add(other);
	}

	@Override
	public IntInterval sub(IntInterval other) {
		if (other instanceof SingletonIntInterval(var otherSingleValue)) {
			return IntIntervals.exactly(singleValue.subtract(otherSingleValue));
		}
		return NonEmptyIntInterval.super.sub(other);
	}

	@Override
	public IntInterval mul(IntInterval other) {
		if (other instanceof SingletonIntInterval(var otherSingleValue)) {
			return IntIntervals.exactly(singleValue.multiply(otherSingleValue));
		}
		return NonEmptyIntInterval.super.mul(other);
	}

	@Override
	public String toString() {
		return singleValue.toString();
	}
}
