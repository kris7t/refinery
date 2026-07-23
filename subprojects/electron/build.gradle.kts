/*
 * SPDX-FileCopyrightText: 2021-2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import org.panteleyev.jlink.JLinkTask
import org.siouan.frontendgradleplugin.infrastructure.gradle.RunYarnTaskType

plugins {
	id("tools.refinery.gradle.frontend-workspace")
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
	typeCheckTypes(project(":refinery-frontend", "typings"))
}

val esBuildOutputDir = layout.buildDirectory.dir("esbuild")

val productionResources: Provider<Directory> = esBuildOutputDir.map { it.dir("production") }

val distDir = layout.buildDirectory.dir("dist")

val assembleFiles: FileCollection = files(
	rootProject.project("refinery-frontend").file("tsconfig.shared.json"),
	"electron-builder.config.mjs",
	"esbuild.mjs",
) + fileTree("app") + fileTree("scripts")

val lintingFiles: FileCollection = assembleFiles + files(
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
		dependsOn(assembleFiles)
		inputs.files(backendDistribution)
		outputs.dir(layout.buildDirectory.dir("backend"))
		outputs.dir(layout.buildDirectory.dir("esbuild/production"))
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
		outputs.dir(distDir)
	}

	typeCheckFrontend {
		dependsOn(rootProject.project("refinery-frontend").tasks.named("typeCheckFrontend"))
		inputs.files(lintingFiles)
	}

	lintFrontend {
		inputs.files(lintingFiles)
	}

	fixFrontend {
		inputs.files(lintingFiles)
	}
}
