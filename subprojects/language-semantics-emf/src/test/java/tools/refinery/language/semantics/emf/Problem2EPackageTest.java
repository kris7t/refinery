/*
 * SPDX-FileCopyrightText: 2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.language.semantics.emf;

import com.google.inject.Inject;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.xmi.XMIResource;
import org.eclipse.emf.ecore.xmi.impl.XMIResourceImpl;
import org.eclipse.xtext.resource.IResourceFactory;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.testing.InjectWith;
import org.eclipse.xtext.testing.extensions.InjectionExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.refinery.language.model.problem.Problem;
import tools.refinery.language.semantics.emf.tests.SerializerUtils;
import tools.refinery.language.tests.ProblemInjectorProvider;

import java.io.IOException;
import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

@ExtendWith(InjectionExtension.class)
@InjectWith(ProblemInjectorProvider.class)
class Problem2EPackageTest {
	@Inject
	private XtextResourceSet resourceSet;

	@Inject
	private IResourceFactory resourceFactory;

	@Inject
	private Problem2EPackage problem2EPackage;

	@ParameterizedTest
	@ValueSource(strings = {
			"ecore",
			"filesystem",
			"functionalarchitecture",
			"railway",
			"satellite",
			"statechart"
	})
	void problem2EcoreTest(String name) throws IOException {
		var problemName = name + ".problem";
		var problemFile = "input/refinery/" + problemName;
		var ecoreFile = "expected/ecore/%s.ecore".formatted(name);

		var problemResource = resourceFactory.createResource(URI.createURI(problemName));
		resourceSet.getResources().add(problemResource);
		var classLoader = getClass().getClassLoader();
		SerializerUtils.readTestInput(classLoader, problemFile, problemResource);
		var problem = (Problem) problemResource.getContents().get(0);

		var ePackage = problem2EPackage.transformProblem(problem);
		var ecoreResourceSet = new ResourceSetImpl();
		var ecoreResource = new XMIResourceImpl();
		ecoreResourceSet.getResources().add(ecoreResource);
		ecoreResource.getContents().add(ePackage);
		var serializedEPackage = SerializerUtils.serializeResource(ecoreResource, Map.of(
				XMIResource.OPTION_DECLARE_XML, true,
				XMIResource.OPTION_ENCODING, "UTF-8",
				XMIResource.OPTION_LINE_WIDTH, 80
		));

		var expectedEPackage = SerializerUtils.readExpectedOutput(classLoader, ecoreFile);

		assertThat(serializedEPackage, is(expectedEPackage));
	}
}
