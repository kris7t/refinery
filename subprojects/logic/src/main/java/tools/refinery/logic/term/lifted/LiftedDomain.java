/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term.lifted;

import tools.refinery.logic.AbstractDomain;

public final class LiftedDomain<T> implements AbstractDomain<Lifted<T>, T> {
	private final Class<T> concreteType;
	private final Lifted<T> unknown;

    public LiftedDomain(Class<T> concreteType, T defaultValue) {
        this.concreteType = concreteType;
        this.unknown = new LiftedUnknown<>(defaultValue);
    }

    @Override
	public Class<Lifted<T>> abstractType() {
		// The generic type parameter is erased at runtime, so this cast is a no-op. We must pay attention not to mix
		// lifted values of different {@code T} at runtime, as Java reflection won't help us.
		@SuppressWarnings("unchecked")
		var abstractType = (Class<Lifted<T>>) (Class<?>) Lifted.class;
		return abstractType;
	}

	@Override
	public Class<T> concreteType() {
		return concreteType;
	}

	@Override
	public Lifted<T> unknown() {
		return unknown;
	}

	@Override
	public Lifted<T> error() {
		// {@code T} doesn't appear in {@code LiftedError}, so this is safe.
		@SuppressWarnings("unchecked")
		var error = (Lifted<T>) LiftedError.INSTANCE;
		return error;
	}

	@Override
	public Lifted<T> toAbstract(T concreteValue) {
		return new LiftedSome<>(this, concreteValue);
	}
}
