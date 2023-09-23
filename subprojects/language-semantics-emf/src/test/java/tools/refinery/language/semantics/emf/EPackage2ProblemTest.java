/*
 * SPDX-FileCopyrightText: 2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.language.semantics.emf;

import com.google.inject.Inject;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EPackage;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.xcore.XcoreStandaloneSetup;
import org.eclipse.emf.ecore.xmi.impl.XMIResourceImpl;
import org.eclipse.xtext.resource.IResourceFactory;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.testing.InjectWith;
import org.eclipse.xtext.testing.extensions.InjectionExtension;
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
		loadTestInput(ecoreFile, ecoreResource);
		var ePackage = (EPackage) ecoreResource.getContents().get(0);

		transformAndCheckEPackage(problemFile, ePackage);
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"railway"
	})
	void xcore2ProblemTest(String name) throws IOException {
		var xcoreFile = name + ".xcore";
		var problemFile = name + ".problem";

		var xcoreInjector = new XcoreStandaloneSetup().createInjectorAndDoEMFRegistration();
		var resourceSet = xcoreInjector.getInstance(XtextResourceSet.class);
		var resourceFactory = xcoreInjector.getInstance(IResourceFactory.class);
		var xcoreResource = resourceFactory.createResource(URI.createURI(xcoreFile));
		resourceSet.getResources().add(xcoreResource);
		loadTestInput(xcoreFile, xcoreResource);
		var ePackageOption = xcoreResource.getContents().stream().filter(EPackage.class::isInstance).findFirst();
		assertThat(ePackageOption.isPresent(), is(true));
		var ePackage = (EPackage) ePackageOption.get();

		transformAndCheckEPackage(problemFile, ePackage);
	}

	private void loadTestInput(String inputFile, Resource resource) throws IOException {
		var classLoader = getClass().getClassLoader();
		try (var inputStream = classLoader.getResourceAsStream(inputFile)) {
			if (inputStream == null) {
				throw new IllegalStateException("Test input not found: " + inputFile);
			}
			resource.load(inputStream, Map.of());
		}
	}

	private void transformAndCheckEPackage(String problemFile, EPackage ePackage) throws IOException {
		var problem = ePackage2Problem.transformEPackage(ePackage);
		var problemResource = problem.eResource();

		String serializedProblem;
		try (var outputStream = new ByteArrayOutputStream()) {
			problemResource.save(outputStream, Map.of());
			serializedProblem = outputStream.toString(StandardCharsets.UTF_8);
		}
		serializedProblem = normalizeNewlines(serializedProblem);

		var classLoader = getClass().getClassLoader();
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
