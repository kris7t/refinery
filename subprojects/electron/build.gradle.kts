/*
 * SPDX-FileCopyrightText: 2021-2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import org.panteleyev.jlink.JLinkTask
import org.siouan.frontendgradleplugin.infrastructure.gradle.RunYarnTaskType
import tools.refinery.gradle.utils.SonarPropertiesUtils

plugins {
	id("tools.refinery.gradle.frontend-workspace")
	id("tools.refinery.gradle.sonarqube")
}

frontend {
	assembleScript.set("run build")
}

val frontendAssets: Configuration = configurations.create("frontendAssets") {
	isCanBeConsumed = false
	isCanBeResolved = true
}

val backendDistribution: Configuration = configurations.create("backendDistribution") {
	isCanBeConsumed = false
	isCanBeResolved = true
}

dependencies {
	frontendAssets(project(":refinery-frontend", "productionAssets"))
	backendDistribution(project(":refinery-language-web", "distTar"))
}

val esBuildOutputDir = layout.buildDirectory.dir("esbuild")

val productionResources: Provider<Directory> = esBuildOutputDir.map { it.dir("production") }

val sources: FileCollection = fileTree("src")

val installationState: FileCollection = files(
	rootProject.file("yarn.lock"),
	rootProject.file("package.json"),
	"package.json",
)

val assembleConfigFiles: FileCollection = installationState + files(
	rootProject.file("tsconfig.base.json"),
	rootProject.project("refinery-frontend").file("tsconfig.shared.json"),
	"tsconfig.json",
	"electron-builder.config.mjs",
	"esbuild.mjs",
) + fileTree("app") + fileTree("scripts")

val assembleFiles: FileCollection = sources + assembleConfigFiles

val lintingFiles: FileCollection = sources + assembleConfigFiles + files(
	rootProject.file(".eslintrc.cjs"),
	rootProject.file("prettier.config.cjs"),
)

tasks {
	val jlink = register<JLinkTask>("jlink") {
		noHeaderFiles = true
		noManPages = true
		stripDebug = true
		addModules = listOf("java.base", "java.logging", "java.management", "java.naming", "java.xml", "jdk.zipfs")
		output.set(layout.buildDirectory.dir("jre"))
		description = "Create a stripped down JRE"
	}

	var extractBackend = register<RunYarnTaskType>("extractBackend") {
		dependsOn(installFrontend)
		dependsOn(assembleConfigFiles)
		inputs.files(backendDistribution)
		outputs.dir(layout.buildDirectory.dir("backend"))
		args.set("run backend:extract")
		description = "Extract backend binaries"
	}

	assembleFrontend {
		dependsOn(jlink)
		dependsOn(extractBackend)
		inputs.files(frontendAssets)
		inputs.dir(layout.buildDirectory.dir("jre"))
		inputs.dir(layout.buildDirectory.dir("backend"))
		inputs.files(assembleFiles)
		outputs.dir(productionResources)
	}

	val typeCheckFrontend = register<RunYarnTaskType>("typeCheckFrontend") {
		dependsOn(installFrontend)
		dependsOn(rootProject.project("refinery-frontend").tasks.named("typeCheckFrontend"))
		inputs.files(lintingFiles)
		outputs.dir(layout.buildDirectory.dir("typescript"))
		args.set("run typecheck")
		group = "verification"
		description = "Check for TypeScript type errors."
	}

	val lintFrontend = register<RunYarnTaskType>("lintFrontend") {
		dependsOn(installFrontend)
		dependsOn(typeCheckFrontend)
		inputs.files(lintingFiles)
		outputs.file(layout.buildDirectory.file("eslint.json"))
		args.set("run lint")
		group = "verification"
		description = "Check for TypeScript lint errors and warnings."
	}

	register<RunYarnTaskType>("fixFrontend") {
		dependsOn(installFrontend)
		dependsOn(typeCheckFrontend)
		inputs.files(lintingFiles)
		args.set("run lint:fix")
		group = "verification"
		description = "Fix TypeScript lint errors and warnings."
	}

	check {
		dependsOn(typeCheckFrontend)
		dependsOn(lintFrontend)
	}
}

sonarqube.properties {
	SonarPropertiesUtils.addToList(properties, "sonar.sources", "src")
	property("sonar.nodejs.executable", "${frontend.nodeInstallDirectory.get()}/bin/node")
	property("sonar.eslint.reportPaths", "${layout.buildDirectory.get()}/eslint.json")
}
