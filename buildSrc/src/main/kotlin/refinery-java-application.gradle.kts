import org.gradle.accessors.dm.LibrariesForLibs

plugins {
	application
	id("com.github.johnrengelman.shadow")
}

apply(plugin = "refinery-java-conventions")

// Use log4j-over-slf4j instead of log4j 1.x when running the application.
configurations.named("runtimeClasspath") {
	exclude(group = "log4j", module = "log4j")
}

val libs = the<LibrariesForLibs>()

dependencies {
	implementation(libs.slf4j.simple)
	implementation(libs.slf4j.log4j)
}

for (taskName in listOf("distTar", "distZip", "shadowDistTar", "shadowDistZip")) {
	tasks.named(taskName) {
		enabled = false
	}
}
