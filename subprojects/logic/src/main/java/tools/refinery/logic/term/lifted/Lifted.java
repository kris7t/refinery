/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.term.lifted;

import tools.refinery.logic.AbstractValue;

public sealed interface Lifted<T> extends AbstractValue<Lifted<T>, T> permits LiftedUnknown, LiftedError, LiftedSome {
}
