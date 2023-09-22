/*
 * SPDX-FileCopyrightText: 2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.language.formatting2;

import com.google.inject.Provider;
import com.google.inject.Singleton;
import org.eclipse.xtext.formatting2.FormatterPreferenceKeys;
import org.eclipse.xtext.formatting2.FormatterRequest;
import org.eclipse.xtext.preferences.MapBasedPreferenceValues;

@Singleton
public class FormatterRequestProvider implements Provider<FormatterRequest> {
	@Override
	public FormatterRequest get() {
		// Normalize formatting for tests.
		var preferences = new MapBasedPreferenceValues();
		preferences.put(FormatterPreferenceKeys.indentation, "    ");
		preferences.put(FormatterPreferenceKeys.lineSeparator, "\n");
		preferences.put(FormatterPreferenceKeys.tabWidth, 4);
		var request = new FormatterRequest();
		request.setPreferences(preferences);
		return request;
	}
}
