/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import org.apfloat.Apint;
import org.jetbrains.annotations.Nullable;

// Singleton pattern, because there is only one empty interval.
@SuppressWarnings("squid:S6548")
public final class EmptyIntInterval implements IntInterval {
	static final EmptyIntInterval INSTANCE = new EmptyIntInterval();

	private EmptyIntInterval() {
	}

	@Override
	@Nullable
	public Apint getConcrete() {
		return null;
	}

	@Override
	@Nullable
	public Apint getArbitrary() {
		return null;
	}

	@Override
	public IntInterval join(IntInterval other) {
		return other;
	}

	@Override
	public IntInterval meet(IntInterval other) {
		return this;
	}

	@Override
	public boolean isRefinementOf(IntInterval other) {
		return true;
	}

	@Override
	public boolean isZero() {
		return false;
	}

	@Override
	public IntInterval minus() {
		return this;
	}

	@Override
	public IntInterval min(IntInterval other) {
		return null;
	}

	@Override
	public IntInterval max(IntInterval other) {
		return null;
	}

	@Override
	public IntInterval add(IntInterval other) {
		return this;
	}

	@Override
	public IntInterval sub(IntInterval other) {
		return this;
	}

	@Override
	public IntInterval mul(IntInterval other) {
		return this;
	}
}
