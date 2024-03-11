/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term.lifted;

import org.jetbrains.annotations.Nullable;

public final class LiftedError<T> implements Lifted<T> {
	static final LiftedError<?> INSTANCE = new LiftedError<>();

	private LiftedError() {
	}

	@Override
	public @Nullable T getConcrete() {
		return null;
	}

	@Override
	public @Nullable T getArbitrary() {
		return null;
	}

	@Override
	public Lifted<T> join(Lifted<T> other) {
		return other;
	}

	@Override
	public Lifted<T> meet(Lifted<T> other) {
		return this;
	}

	@Override
	public String toString() {
		return "error";
	}
}
