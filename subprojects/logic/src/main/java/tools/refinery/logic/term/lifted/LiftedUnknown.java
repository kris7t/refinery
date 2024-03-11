/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term.lifted;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public final class LiftedUnknown<T> implements Lifted<T> {
	private final @NotNull T arbitrary;

    LiftedUnknown(@NotNull T arbitrary) {
        this.arbitrary = arbitrary;
    }

    @Override
	public @Nullable T getConcrete() {
		return null;
	}

	@Override
	public @NotNull T getArbitrary() {
		return arbitrary;
	}

	@Override
	public Lifted<T> join(Lifted<T> other) {
		return this;
	}

	@Override
	public Lifted<T> meet(Lifted<T> other) {
		return other;
	}

	@Override
	public String toString() {
		return "unknown";
	}
}
