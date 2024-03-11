/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term.lifted;

import org.jetbrains.annotations.NotNull;

import java.util.Objects;

public final class LiftedSome<T> implements Lifted<T> {
	private final LiftedDomain<T> domain;
    private final T value;

    LiftedSome(LiftedDomain<T> domain, T value) {
        this.domain = domain;
        this.value = value;
    }

    @Override
    public @NotNull T getConcrete() {
        return value;
    }

    @Override
    public @NotNull T getArbitrary() {
        return getConcrete();
    }

    @Override
    public Lifted<T> join(Lifted<T> other) {
        return equals(other) ? this : domain.unknown();
    }

    @Override
    public Lifted<T> meet(Lifted<T> other) {
        return equals(other) ? this : domain.error();
    }

    @Override
    public boolean equals(Object obj) {
        if (obj == this) return true;
        if (obj == null || obj.getClass() != this.getClass()) return false;
        var that = (LiftedSome<?>) obj;
        return Objects.equals(this.value, that.value);
    }

    @Override
    public int hashCode() {
        return value.hashCode();
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
