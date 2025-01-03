/*
 * SPDX-FileCopyrightText: 2025 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.language.web.api.util;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import tools.refinery.language.web.api.dto.Scope;

public class ConsistentBoundsValidator implements ConstraintValidator<ConsistentBounds, Scope> {
	@Override
	public boolean isValid(Scope value, ConstraintValidatorContext context) {
		return value.getUpperBound() == null || value.getLowerBound() <= value.getUpperBound();
	}
}
