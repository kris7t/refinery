/*
 * SPDX-FileCopyrightText: 2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.language.semantics.emf;

import com.google.inject.Inject;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.*;
import org.eclipse.xtext.resource.DerivedStateAwareResource;
import org.eclipse.xtext.resource.FileExtensionProvider;
import org.eclipse.xtext.resource.IResourceFactory;
import org.eclipse.xtext.resource.XtextResourceSet;
import tools.refinery.language.model.problem.*;
import tools.refinery.language.utils.BuiltinSymbols;
import tools.refinery.language.utils.ProblemDesugarer;

import java.util.LinkedHashMap;
import java.util.Map;

public class EPackage2Problem {
	@Inject
	private FileExtensionProvider fileExtensionProvider;

	@Inject
	private XtextResourceSet resourceSet;

	@Inject
	private IResourceFactory resourceFactory;

	@Inject
	private ProblemDesugarer desugarer;

	private Problem problem;

	private BuiltinSymbols builtinSymbols;

	private final Map<EClassifier, Statement> classifierTrace = new LinkedHashMap<>();

	private final Map<EStructuralFeature, FeatureDeclaration> featureTrace = new LinkedHashMap<>();

	public Problem transformEPackage(EPackage ePackage) {
		var problemName = ePackage.getNsPrefix();
		var uri = URI.createURI(problemName + "." + fileExtensionProvider.getPrimaryFileExtension());
		var resource = resourceFactory.createResource(uri);
		resourceSet.getResources().add(resource);
		problem = ProblemFactory.eINSTANCE.createProblem();
		problem.setName(problemName);
		problem.setUri(ePackage.getNsURI());
		resource.getContents().add(problem);
		builtinSymbols = desugarer.getBuiltinSymbols(problem).orElseThrow(() -> new IllegalArgumentException(
				"Failed to load builtin library"));
		if (!ePackage.getESubpackages().isEmpty()) {
			throw new IllegalStateException("Subpackages are not supported");
		}
		transformClassifiers(ePackage);
		transformFeatures(ePackage);
		transformOpposites(ePackage);
		if (resource instanceof DerivedStateAwareResource derivedStateAwareResource) {
			// Discard any current derived state to set {@code fullyInitialized} to {@code false} and force the
			// re-creation of derived state on {@code installDerivedState}.
			derivedStateAwareResource.discardDerivedState();
			derivedStateAwareResource.installDerivedState(false);
		}
		return problem;
	}

	private void transformClassifiers(EPackage ePackage) {
		for (var classifier : ePackage.getEClassifiers()) {
			Statement statement;
			if (classifier instanceof EClass eClass) {
				statement = transformEClass(eClass);
			} else if (classifier instanceof EEnum eEnum) {
				statement = transformEEnum(eEnum);
			} else {
				statement = null;
			}
			if (statement != null) {
				problem.getStatements().add(statement);
				classifierTrace.put(classifier, statement);
			}
		}
	}

	private ClassDeclaration transformEClass(EClass eClass) {
		var classDeclaration = ProblemFactory.eINSTANCE.createClassDeclaration();
		classDeclaration.setName(eClass.getName());
		classDeclaration.setAbstract(eClass.isAbstract());
		return classDeclaration;
	}

	private EnumDeclaration transformEEnum(EEnum eEnum) {
		var enumDeclaration = ProblemFactory.eINSTANCE.createEnumDeclaration();
		enumDeclaration.setName(eEnum.getName());
		for (var eLiteral : eEnum.getELiterals()) {
			var node = ProblemFactory.eINSTANCE.createNode();
			node.setName(eLiteral.getName());
			enumDeclaration.getLiterals().add(node);
		}
		return enumDeclaration;
	}

	private void transformFeatures(EPackage ePackage) {
		for (var classifier : ePackage.getEClassifiers()) {
			if (classifier instanceof EClass eClass) {
				transformFeatures(eClass);
			}
		}
	}

	private void transformFeatures(EClass eClass) {
		var sourceRelation = classifierTrace.get(eClass);
		if (!(sourceRelation instanceof ClassDeclaration classDeclaration)) {
			throw new AssertionError("Did not transform EClass: " + eClass);
		}
		transformSupertypes(eClass, classDeclaration);
		for (var feature : eClass.getEStructuralFeatures()) {
			if (feature.isVolatile()) {
				// Volatile features are not stored.
				continue;
			}
			FeatureDeclaration featureDeclaration;
			if (feature instanceof EReference eReference) {
				featureDeclaration = transformEReference(eReference);
			} else if (feature instanceof EAttribute eAttribute) {
				featureDeclaration = transformEAttribute(eAttribute);
			} else {
				throw new IllegalArgumentException("Unknown EStructuralFeature: " + feature);
			}
			if (featureDeclaration != null) {
				classDeclaration.getFeatureDeclarations().add(featureDeclaration);
				featureTrace.put(feature, featureDeclaration);
			}
		}
	}

	private void transformSupertypes(EClass eClass, ClassDeclaration classDeclaration) {
		for (var superclass : eClass.getESuperTypes()) {
			var statement = classifierTrace.get(superclass);
			if (statement instanceof ClassDeclaration superclassDeclaration) {
				classDeclaration.getSuperTypes().add(superclassDeclaration);
			} else if (!EcorePackage.Literals.EOBJECT.equals(superclass)) {
				throw new IllegalArgumentException("Unknown superclass %s of EClass %s".formatted(superclass, eClass));
			}
		}
	}

	private FeatureDeclaration transformEReference(EReference eReference) {
		var targetDeclaration = getTargetDeclaration(eReference);
		var referenceDeclaration = ProblemFactory.eINSTANCE.createReferenceDeclaration();
		referenceDeclaration.setName(eReference.getName());
		referenceDeclaration.setReferenceType(targetDeclaration);
		if (eReference.isContainer()) {
			// Multiplicity should be ignored for container references.
			referenceDeclaration.setKind(ReferenceKind.CONTAINER);
		} else {
			referenceDeclaration.setMultiplicity(transformMultiplicity(eReference));
			if (eReference.isContainment()) {
				referenceDeclaration.setKind(ReferenceKind.CONTAINMENT);
			} else {
				referenceDeclaration.setKind(ReferenceKind.REFERENCE);
			}
		}
		return referenceDeclaration;
	}

	private ClassDeclaration getTargetDeclaration(EReference eReference) {
		var referenceType = eReference.getEReferenceType();
		if (EcorePackage.Literals.EOBJECT.equals(referenceType)) {
			return builtinSymbols.node();
		}
		var targetRelation = classifierTrace.get(referenceType);
		if (targetRelation instanceof ClassDeclaration classDeclaration) {
			return classDeclaration;
		}
		throw new IllegalArgumentException("Unknown target %s of reference %s"
				.formatted(referenceType, eReference));
	}

	private FeatureDeclaration transformEAttribute(EAttribute eAttribute) {
		var targetRelation = classifierTrace.get(eAttribute.getEAttributeType());
		if (!(targetRelation instanceof EnumDeclaration enumDeclaration)) {
			// We only transform enum declarations.
			return null;
		}
		var referenceDeclaration = ProblemFactory.eINSTANCE.createReferenceDeclaration();
		referenceDeclaration.setName(eAttribute.getName());
		referenceDeclaration.setReferenceType(enumDeclaration);
		referenceDeclaration.setMultiplicity(transformMultiplicity(eAttribute));
		referenceDeclaration.setKind(ReferenceKind.REFERENCE);
		return referenceDeclaration;
	}

	private Multiplicity transformMultiplicity(EStructuralFeature feature) {
		var lowerBound = feature.getLowerBound();
		if (lowerBound < 0) {
			throw new IllegalArgumentException("Invalid lower bound %d for feature %s".formatted(lowerBound, feature));
		}
		var upperBound = feature.getUpperBound();
		if (lowerBound == 0 && upperBound == 1) {
			return null;
		}
		if (lowerBound == upperBound) {
			var exactMultiplicity = ProblemFactory.eINSTANCE.createExactMultiplicity();
			exactMultiplicity.setExactValue(lowerBound);
			return exactMultiplicity;
		}
		if (lowerBound == 0 && upperBound < 0) {
			return ProblemFactory.eINSTANCE.createUnboundedMultiplicity();
		}
		var rangeMultiplicity = ProblemFactory.eINSTANCE.createRangeMultiplicity();
		rangeMultiplicity.setLowerBound(lowerBound);
		rangeMultiplicity.setUpperBound(upperBound < 0 ? -1 : upperBound);
		return rangeMultiplicity;
	}

	private void transformOpposites(EPackage ePackage) {
		for (var classifier : ePackage.getEClassifiers()) {
			if (classifier instanceof EClass eClass) {
				for (var eReference : eClass.getEReferences()) {
					transformOpposite(eReference);
				}
			}
		}
	}

	private void transformOpposite(EReference eReference) {
		var relation = featureTrace.get(eReference);
		if (!(relation instanceof ReferenceDeclaration referenceDeclaration)) {
			// Volatile EReferences are skipped in {@code transformEReference}.
			return;
		}
		var oppositeReference = eReference.getEOpposite();
		if (oppositeReference != null) {
			var oppositeRelation = featureTrace.get(oppositeReference);
			if (!(oppositeRelation instanceof ReferenceDeclaration oppositeDeclaration)) {
				throw new IllegalArgumentException("Unknown opposite %s of %s"
						.formatted(oppositeReference, eReference));
			}
			referenceDeclaration.setOpposite(oppositeDeclaration);
		}
	}
}
