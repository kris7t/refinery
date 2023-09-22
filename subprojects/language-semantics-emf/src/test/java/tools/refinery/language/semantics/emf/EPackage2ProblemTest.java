/*
 * SPDX-FileCopyrightText: 2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.language.semantics.emf;

import com.google.inject.Inject;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EPackage;
import org.eclipse.emf.ecore.EcorePackage;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.xmi.impl.XMIResourceImpl;
import org.eclipse.xtext.testing.InjectWith;
import org.eclipse.xtext.testing.extensions.InjectionExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.refinery.language.tests.ProblemInjectorProvider;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

@ExtendWith(InjectionExtension.class)
@InjectWith(ProblemInjectorProvider.class)
class EPackage2ProblemTest {
	@Inject
	private EPackage2Problem ePackage2Problem;

	@BeforeEach
	void beforeEach() {
		EPackage.Registry.INSTANCE.put(EcorePackage.eNS_URI, EcorePackage.eINSTANCE);
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"ecore",
			"filesystem",
			"functionalarchitecture",
			"satellite",
			"statechart"
	})
	void ecore2ProblemTest(String name) throws IOException {
		var ecoreFile = name + ".ecore";
		var problemFile = name + ".problem";

		var resourceSet = new ResourceSetImpl();
		var ecoreResource = new XMIResourceImpl(URI.createURI(ecoreFile));
		resourceSet.getResources().add(ecoreResource);
		var classLoader = getClass().getClassLoader();
		try (var inputStream = classLoader.getResourceAsStream(ecoreFile)) {
			if (inputStream == null) {
				throw new IllegalStateException("Test input not found: " + ecoreFile);
			}
			ecoreResource.load(inputStream, Map.of());
		}
		var ePackage = (EPackage) ecoreResource.getContents().get(0);

		var problem = ePackage2Problem.transformEPackage(ePackage);
		var problemResource = problem.eResource();

		String serializedProblem;
		try (var outputStream = new ByteArrayOutputStream()) {
			problemResource.save(outputStream, Map.of());
			serializedProblem = outputStream.toString(StandardCharsets.UTF_8);
		}
		serializedProblem = normalizeNewlines(serializedProblem);

		String expectedProblem;
		try (var inputStream = classLoader.getResourceAsStream(problemFile)) {
			if (inputStream == null) {
				throw new IllegalStateException("Expected output not found: " + problemFile);
			}
			expectedProblem = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
		}
		expectedProblem = normalizeNewlines(expectedProblem);

		assertThat(serializedProblem, is(expectedProblem));
	}

	private static String normalizeNewlines(String string) {
		return string.replace("\r\n", "\n").trim();
	}
}
