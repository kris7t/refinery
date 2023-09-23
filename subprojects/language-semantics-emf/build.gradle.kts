/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

plugins {
	id("tools.refinery.gradle.java-library")
}

configurations.all {
	resolutionStrategy.dependencySubstitution {
		substitute(module("org.antlr:antlr-runtime:[3.2.0, 3.2.1)"))
				.using(module("org.antlr:antlr-runtime:3.2"))
				.because("Xcore requires org.antlr:antlr-runtime 3.2.0, " +
						"but only 3.2 is available in Maven Central")
	}
}

dependencies {
	api(project(":refinery-language-semantics"))
	api(libs.ecore)
	testImplementation(testFixtures(project(":refinery-language")))
	testImplementation(libs.ecore.xcore)
	testImplementation(libs.ecore.xmi)
}
