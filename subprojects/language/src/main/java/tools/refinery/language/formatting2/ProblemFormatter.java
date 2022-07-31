/*
 * generated by Xtext 2.26.0.M2
 */
package tools.refinery.language.formatting2;

import org.eclipse.emf.ecore.EObject;
import org.eclipse.xtext.formatting2.AbstractJavaFormatter;
import org.eclipse.xtext.formatting2.IFormattableDocument;
import org.eclipse.xtext.formatting2.IHiddenRegionFormatter;
import org.eclipse.xtext.formatting2.regionaccess.ISemanticRegionsFinder;
import org.eclipse.xtext.formatting2.regionaccess.ISequentialRegion;
import org.eclipse.xtext.xbase.lib.Procedures.Procedure1;

import tools.refinery.language.model.problem.Assertion;
import tools.refinery.language.model.problem.Atom;
import tools.refinery.language.model.problem.ClassDeclaration;
import tools.refinery.language.model.problem.Conjunction;
import tools.refinery.language.model.problem.IndividualDeclaration;
import tools.refinery.language.model.problem.NegativeLiteral;
import tools.refinery.language.model.problem.Parameter;
import tools.refinery.language.model.problem.PredicateDefinition;
import tools.refinery.language.model.problem.Problem;
import tools.refinery.language.model.problem.ProblemPackage;

public class ProblemFormatter extends AbstractJavaFormatter {

	protected void format(Problem problem, IFormattableDocument doc) {
		doc.prepend(problem, this::noSpace);
		var region = regionFor(problem);
		doc.append(region.keyword("problem"), this::oneSpace);
		doc.prepend(region.keyword("."), this::noSpace);
		appendNewLines(doc, region.keyword("."), this::twoNewLines);
		for (var statement : problem.getStatements()) {
			doc.format(statement);
		}
	}

	protected void format(Assertion assertion, IFormattableDocument doc) {
		surroundNewLines(doc, assertion, this::singleNewLine);
		var region = regionFor(assertion);
		doc.append(region.feature(ProblemPackage.Literals.ASSERTION__DEFAULT), this::oneSpace);
		doc.append(region.feature(ProblemPackage.Literals.ASSERTION__VALUE), this::noSpace);
		doc.append(region.feature(ProblemPackage.Literals.ASSERTION__RELATION), this::noSpace);
		formatParenthesizedList(region, doc);
		doc.prepend(region.keyword(":"), this::noSpace);
		doc.append(region.keyword(":"), this::oneSpace);
		doc.prepend(region.keyword("."), this::noSpace);
		for (var argument : assertion.getArguments()) {
			doc.format(argument);
		}
	}

	protected void format(ClassDeclaration classDeclaration, IFormattableDocument doc) {
		surroundNewLines(doc, classDeclaration, this::twoNewLines);
		var region = regionFor(classDeclaration);
		doc.append(region.feature(ProblemPackage.Literals.CLASS_DECLARATION__ABSTRACT), this::oneSpace);
		doc.append(region.keyword("class"), this::oneSpace);
		doc.surround(region.keyword("extends"), this::oneSpace);
		formatList(region, ",", doc);
		doc.prepend(region.keyword("{"), this::oneSpace);
		doc.append(region.keyword("{"), it -> it.setNewLines(1, 1, 2));
		doc.prepend(region.keyword("}"), it -> it.setNewLines(1, 1, 2));
		doc.prepend(region.keyword("."), this::noSpace);
		for (var referenceDeclaration : classDeclaration.getReferenceDeclarations()) {
			doc.format(referenceDeclaration);
		}
	}

	protected void format(PredicateDefinition predicateDefinition, IFormattableDocument doc) {
		surroundNewLines(doc, predicateDefinition, this::twoNewLines);
		var region = regionFor(predicateDefinition);
		doc.append(region.keyword("pred"), this::oneSpace);
		doc.append(region.feature(ProblemPackage.Literals.NAMED_ELEMENT__NAME), this::noSpace);
		formatParenthesizedList(region, doc);
		doc.surround(region.keyword("<->"), this::oneSpace);
		formatList(region, ";", doc);
		doc.prepend(region.keyword("."), this::noSpace);
		for (var parameter : predicateDefinition.getParameters()) {
			doc.format(parameter);
		}
		for (var body : predicateDefinition.getBodies()) {
			doc.format(body);
		}
	}

	protected void format(Parameter parameter, IFormattableDocument doc) {
		doc.append(regionFor(parameter).feature(ProblemPackage.Literals.PARAMETER__PARAMETER_TYPE), this::oneSpace);
	}

	protected void format(Conjunction conjunction, IFormattableDocument doc) {
		var region = regionFor(conjunction);
		formatList(region, ",", doc);
		for (var literal : conjunction.getLiterals()) {
			doc.format(literal);
		}
	}

	protected void format(NegativeLiteral literal, IFormattableDocument doc) {
		var region = regionFor(literal);
		doc.append(region.feature(ProblemPackage.Literals.LITERAL__MODALITY), this::oneSpace);
		doc.append(region.keyword("!"), this::noSpace);
		doc.format(literal.getAtom());
	}

	protected void format(Atom atom, IFormattableDocument doc) {
		var region = regionFor(atom);
		doc.append(region.feature(ProblemPackage.Literals.LITERAL__MODALITY), this::oneSpace);
		doc.append(region.feature(ProblemPackage.Literals.ATOM__RELATION), this::noSpace);
		doc.append(region.feature(ProblemPackage.Literals.ATOM__TRANSITIVE_CLOSURE), this::noSpace);
		formatParenthesizedList(region, doc);
		for (var argument : atom.getArguments()) {
			doc.format(argument);
		}
	}

	protected void format(IndividualDeclaration individualDeclaration, IFormattableDocument doc) {
		surroundNewLines(doc, individualDeclaration, this::singleNewLine);
		var region = regionFor(individualDeclaration);
		doc.append(region.keyword("indiv"), this::oneSpace);
		formatList(region, ",", doc);
		doc.prepend(region.keyword("."), this::noSpace);
	}

	protected void formatParenthesizedList(ISemanticRegionsFinder region, IFormattableDocument doc) {
		doc.append(region.keyword("("), this::noSpace);
		doc.prepend(region.keyword(")"), this::noSpace);
		formatList(region, ",", doc);
	}

	protected void formatList(ISemanticRegionsFinder region, String separator, IFormattableDocument doc) {
		for (var comma : region.keywords(separator)) {
			doc.prepend(comma, this::noSpace);
			doc.append(comma, this::oneSpace);
		}
	}

	protected void singleNewLine(IHiddenRegionFormatter it) {
		it.setNewLines(1, 1, 2);
	}

	protected void twoNewLines(IHiddenRegionFormatter it) {
		it.highPriority();
		it.setNewLines(2);
	}

	protected void surroundNewLines(IFormattableDocument doc, EObject eObject,
			Procedure1<? super IHiddenRegionFormatter> init) {
		var region = doc.getRequest().getTextRegionAccess().regionForEObject(eObject);
		preprendNewLines(doc, region, init);
		appendNewLines(doc, region, init);
	}

	protected void preprendNewLines(IFormattableDocument doc, ISequentialRegion region,
			Procedure1<? super IHiddenRegionFormatter> init) {
		if (region == null) {
			return;
		}
		var previousHiddenRegion = region.getPreviousHiddenRegion();
		if (previousHiddenRegion == null) {
			return;
		}
		if (previousHiddenRegion.getPreviousSequentialRegion() == null) {
			doc.set(previousHiddenRegion, it -> it.setNewLines(0));
		} else {
			doc.set(previousHiddenRegion, init);
		}
	}

	protected void appendNewLines(IFormattableDocument doc, ISequentialRegion region,
			Procedure1<? super IHiddenRegionFormatter> init) {
		if (region == null) {
			return;
		}
		var nextHiddenRegion = region.getNextHiddenRegion();
		if (nextHiddenRegion == null) {
			return;
		}
		if (nextHiddenRegion.getNextSequentialRegion() == null) {
			doc.set(nextHiddenRegion, it -> it.setNewLines(1));
		} else {
			doc.set(nextHiddenRegion, init);
		}
	}
}
