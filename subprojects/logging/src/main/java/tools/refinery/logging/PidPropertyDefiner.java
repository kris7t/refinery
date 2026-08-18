/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logging;

public class PidPropertyDefiner extends ch.qos.logback.core.PropertyDefinerBase {
	@Override
	public String getPropertyValue() {
		return String.valueOf(ProcessHandle.current().pid());
	}
}
