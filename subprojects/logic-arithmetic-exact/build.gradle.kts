/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

plugins {
	id("tools.refinery.gradle.java-library")
}

dependencies {
	api(libs.apfloat)
	// Disable caching arbitrary-precision numbers on disk.
	api(libs.apfloat.applet)
	api(project(":refinery-logic"))
}
