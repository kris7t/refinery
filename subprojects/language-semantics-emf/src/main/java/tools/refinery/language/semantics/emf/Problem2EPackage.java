/*
 * SPDX-FileCopyrightText: 2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.language.semantics.emf;

import com.google.inject.Inject;
import org.eclipse.emf.ecore.*;
import org.jetbrains.annotations.NotNull;
import tools.refinery.language.model.problem.*;
import tools.refinery.language.utils.BuiltinSymbols;
import tools.refinery.language.utils.ProblemDesugarer;

import java.util.LinkedHashMap;
import java.util.Map;

public class Problem2EPackage {
	@Inject
	private ProblemDesugarer desugarer;

	private Problem problem;

	private BuiltinSymbols builtinSymbols;

	private EPackage ePackage;

	private final Map<ClassDeclaration, EClass> classTrace = new LinkedHashMap<>();

	private final Map<EnumDeclaration, EEnum> enumTrace = new LinkedHashMap<>();

	private final Map<Node, EEnumLiteral> enumLiteralTrace = new LinkedHashMap<>();

	private final Map<Relation, EStructuralFeature> featureTrace = new LinkedHashMap<>();

	public EPackage transformProblem(Problem problem) {
		this.problem = problem;
		builtinSymbols = desugarer.getBuiltinSymbols(problem).orElseThrow(() -> new IllegalArgumentException(
				"Builtin library not found"));
		ePackage = EcoreFactory.eINSTANCE.createEPackage();
		var name = problem.getName();
		ePackage.setName(name);
		ePackage.setNsPrefix(name);
		ePackage.setNsURI(problem.getUri());
		translateClassifiers();
		translateFeatureDeclarations();
		translateOpposites();
		return ePackage;
	}

	private void translateClassifiers() {
		for (var statement : problem.getStatements()) {
			if (statement instanceof ClassDeclaration classDeclaration) {
				translateClassDeclaration(classDeclaration);
			} else if (statement instanceof EnumDeclaration enumDeclaration) {
				translateEnumDeclaration(enumDeclaration);
			}
		}
	}

	private void translateClassDeclaration(ClassDeclaration classDeclaration) {
		var eClass = EcoreFactory.eINSTANCE.createEClass();
		eClass.setName(classDeclaration.getName());
		eClass.setAbstract(classDeclaration.isAbstract());
		ePackage.getEClassifiers().add(eClass);
		classTrace.put(classDeclaration, eClass);
	}

	private void translateEnumDeclaration(EnumDeclaration enumDeclaration) {
		var eEnum = EcoreFactory.eINSTANCE.createEEnum();
		eEnum.setName(enumDeclaration.getName());
		int value = 0;
		for (var node : enumDeclaration.getLiterals()) {
			var eEnumLiteral = EcoreFactory.eINSTANCE.createEEnumLiteral();
			eEnumLiteral.setName(node.getName());
			eEnumLiteral.setValue(value);
			value++;
			eEnum.getELiterals().add(eEnumLiteral);
			enumLiteralTrace.put(node, eEnumLiteral);
		}
		ePackage.getEClassifiers().add(eEnum);
		enumTrace.put(enumDeclaration, eEnum);
	}

	private void translateFeatureDeclarations() {
		for (var statement : problem.getStatements()) {
			if (statement instanceof ClassDeclaration classDeclaration) {
				translateFeatureDeclarations(classDeclaration);
			}
		}
	}

	private EClass getTranslatedClass(ClassDeclaration classDeclaration) {
		var eClass = classTrace.get(classDeclaration);
		if (eClass == null) {
			throw new AssertionError("Did not translate class declaration: " + classDeclaration);
		}
		return eClass;
	}

	private EEnum getTranslatedEnum(EnumDeclaration enumDeclaration) {
		var eEnum = enumTrace.get(enumDeclaration);
		if (eEnum == null) {
			throw new AssertionError("Did not translate enum declaration: " + enumDeclaration);
		}
		return eEnum;
	}

	private void translateFeatureDeclarations(ClassDeclaration classDeclaration) {
		var eClass = getTranslatedClass(classDeclaration);
		translateSuperTypes(classDeclaration, eClass);
		for (var featureDeclaration : classDeclaration.getFeatureDeclarations()) {
			if (featureDeclaration instanceof ReferenceDeclaration referenceDeclaration) {
				translateReferenceDeclaration(eClass, referenceDeclaration);
			}
		}
	}

	private void translateSuperTypes(ClassDeclaration classDeclaration, EClass eClass) {
		for (var superType : classDeclaration.getSuperTypes()) {
			if (!(superType instanceof ClassDeclaration superTypeDeclaration)) {
				throw new IllegalArgumentException("Invalid supertype %s of class declaration %s"
						.formatted(superType, classDeclaration));
			}
			// Built-in types are mapped to EObject and don't have to be mentioned explicitly as EClass supertypes.
			if (!superTypeDeclaration.equals(builtinSymbols.node()) ||
					!superTypeDeclaration.equals(builtinSymbols.contained())) {
				var superClass = classTrace.get(superTypeDeclaration);
				if (superClass == null) {
					throw new IllegalArgumentException("Unknown supertype: " + superType);
				}
				eClass.getESuperTypes().add(superClass);
			}
		}
	}

	private void translateReferenceDeclaration(EClass eClass, ReferenceDeclaration referenceDeclaration) {
		var eStructuralFeature = geteStructuralFeature(referenceDeclaration);
		eStructuralFeature.setName(referenceDeclaration.getName());
		var multiplicity = referenceDeclaration.getMultiplicity();
		if (multiplicity == null) {
			eStructuralFeature.setLowerBound(0);
			eStructuralFeature.setUpperBound(1);
		} else if (multiplicity instanceof ExactMultiplicity exactMultiplicity) {
			int exactValue = exactMultiplicity.getExactValue();
			eStructuralFeature.setLowerBound(exactValue);
			eStructuralFeature.setUpperBound(exactValue);
		} else if (multiplicity instanceof RangeMultiplicity rangeMultiplicity) {
			eStructuralFeature.setLowerBound(rangeMultiplicity.getLowerBound());
			int upperBound = rangeMultiplicity.getUpperBound();
			eStructuralFeature.setUpperBound(upperBound >= 0 ? upperBound : ETypedElement.UNBOUNDED_MULTIPLICITY);
		} else if (multiplicity instanceof UnboundedMultiplicity) {
			eStructuralFeature.setLowerBound(0);
			eStructuralFeature.setUpperBound(ETypedElement.UNBOUNDED_MULTIPLICITY);
		}
		if (eStructuralFeature.getUpperBound() != 1) {
			eStructuralFeature.setOrdered(false);
		}
		eClass.getEStructuralFeatures().add(eStructuralFeature);
		featureTrace.put(referenceDeclaration, eStructuralFeature);
	}

	@NotNull
	private EStructuralFeature geteStructuralFeature(ReferenceDeclaration referenceDeclaration) {
		var referenceType = referenceDeclaration.getReferenceType();
		if (referenceType instanceof EnumDeclaration enumDeclaration) {
			var eEnum = getTranslatedEnum(enumDeclaration);
			var eAttribute = EcoreFactory.eINSTANCE.createEAttribute();
			eAttribute.setEType(eEnum);
			return eAttribute;
		}
		if (referenceType instanceof ClassDeclaration classDeclaration) {
			var eReference = EcoreFactory.eINSTANCE.createEReference();
			if (referenceDeclaration.getKind() == ReferenceKind.CONTAINMENT) {
				eReference.setContainment(true);
			}
			var targetEClass = getTranslatedClass(classDeclaration);
			eReference.setEType(targetEClass);
			return eReference;
		}
		throw new IllegalArgumentException("Unknown reference type: " + referenceType);
	}

	private void translateOpposites() {
		for (var statement : problem.getStatements()) {
			if (statement instanceof ClassDeclaration classDeclaration) {
				translateOpposites(classDeclaration);
			}
		}
	}

	private void translateOpposites(ClassDeclaration classDeclaration) {
		for (var featureDeclaration : classDeclaration.getFeatureDeclarations()) {
			if (featureDeclaration instanceof ReferenceDeclaration referenceDeclaration) {
				translateOpposite(referenceDeclaration);
			}
		}
	}

	private void translateOpposite(ReferenceDeclaration referenceDeclaration) {
		var oppositeDeclaration = referenceDeclaration.getOpposite();
		if (oppositeDeclaration == null) {
			return;
		}
		var eStructuralFeature = featureTrace.get(referenceDeclaration);
		if (!(eStructuralFeature instanceof EReference eReference)) {
			throw new IllegalArgumentException("Reference with opposite not translated as EReference: " +
					referenceDeclaration);
		}
		var eOppositeFeature = featureTrace.get(oppositeDeclaration);
		if (!(eOppositeFeature instanceof EReference eOppositeReference)) {
			throw new IllegalArgumentException("Opposite %s of reference %s not translated as EReference"
					.formatted(oppositeDeclaration, referenceDeclaration));
		}
		eReference.setEOpposite(eOppositeReference);
	}
}
