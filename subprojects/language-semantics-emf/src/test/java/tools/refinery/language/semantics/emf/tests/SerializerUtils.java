/*
 * SPDX-FileCopyrightText: 2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.language.semantics.emf.tests;

import org.eclipse.emf.ecore.resource.Resource;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public final class SerializerUtils {
	private SerializerUtils() {
		throw new IllegalStateException("This is a static utility class and should not be instantiated directly");
	}

	public static void readTestInput(ClassLoader classLoader, String fileName, Resource resource) throws IOException {
		try (var inputStream = classLoader.getResourceAsStream(fileName)) {
			if (inputStream == null) {
				throw new IllegalArgumentException("Test input not found: " + fileName);
			}
			resource.load(inputStream, Map.of());
		}
	}

	public static String serializeResource(Resource resource) throws IOException {
		return serializeResource(resource, Map.of());
	}

	public static String serializeResource(Resource resource, Map<?, ?> options) throws IOException {
		String serializedResource;
		try (var outputStream = new ByteArrayOutputStream()) {
			resource.save(outputStream, options);
			serializedResource = outputStream.toString(StandardCharsets.UTF_8);
		}
		return normalizeNewlines(serializedResource);
	}

	public static String readExpectedOutput(ClassLoader classLoader, String fileName) throws IOException {
		byte[] expectedOutput;
		try (var inputStream = classLoader.getResourceAsStream(fileName)) {
			if (inputStream == null) {
				throw new IllegalArgumentException("Expected output not found: " + fileName);
			}
			expectedOutput = inputStream.readAllBytes();
		}
		return normalizeNewlines(new String(expectedOutput, StandardCharsets.UTF_8));
	}

	private static String normalizeNewlines(String string) {
		return string.replace("\r\n", "\n").trim();
	}
}
