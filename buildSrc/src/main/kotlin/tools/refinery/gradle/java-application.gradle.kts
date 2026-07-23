/*
 * SPDX-FileCopyrightText: 2021-2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.gradle

import gradle.kotlin.dsl.accessors._cce2b3859407527802ad9abd2c51bda6.application
import gradle.kotlin.dsl.accessors._cce2b3859407527802ad9abd2c51bda6.distTar
import gradle.kotlin.dsl.accessors._cce2b3859407527802ad9abd2c51bda6.distZip
import org.gradle.accessors.dm.LibrariesForLibs
import org.gradle.internal.execution.caching.CachingState.enabled
import tools.refinery.gradle.utils.JvmArgsUtils

plugins {
	application
	id("tools.refinery.gradle.java-conventions")
}

val libs = the<LibrariesForLibs>()

val distTarConfiguration = configurations.create("distTar") {
	isCanBeConsumed = true
	isCanBeResolved = false
}

dependencies {
	runtimeOnly(libs.logback.core)
	runtimeOnly(libs.logback.classic)
	implementation(libs.slf4j.log4j)
	implementation(enforcedPlatform(project(":refinery-bom-dependencies")))
}

application {
	applicationDefaultJvmArgs += JvmArgsUtils.JVM_ARGS
}

tasks.distZip {
	enabled = false
}

artifacts {
	add("distTar", layout.buildDirectory.file("distributions/${name}-${version}.tar")) {
		builtBy(tasks.distTar)
	}
}
