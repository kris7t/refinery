/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.logic.arithmetic.exact.int_;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static tools.refinery.logic.arithmetic.exact.int_.IntIntervals.*;

class IntIntervalTest {
	@ParameterizedTest(name = "{0} + {1} == {2}")
	@MethodSource
	void addTest(IntInterval a, IntInterval b, IntInterval expected) {
		var actual = a.add(b);
		assertThat(actual, is(expected));
	}

	static Stream<Arguments> addTest() {
		return symmetricTest(
				Arguments.of(EMPTY, EMPTY, EMPTY),
				Arguments.of(ALL, EMPTY, EMPTY),
				Arguments.of(ALL, ALL, ALL),
				Arguments.of(exactly(1), exactly(2), exactly(3)),
				Arguments.of(exactly(1), EMPTY, EMPTY),
				Arguments.of(exactly(1), ALL, ALL),
				Arguments.of(exactly(1), between(2, 3), between(3, 4)),
				Arguments.of(atMost(1), atMost(2), atMost(3)),
				Arguments.of(atMost(1), EMPTY, EMPTY),
				Arguments.of(atMost(1), ALL, ALL),
				Arguments.of(atMost(2), atLeast(-3), ALL),
				Arguments.of(atMost(1), exactly(2), atMost(3)),
				Arguments.of(atLeast(1), atLeast(2), atLeast(3)),
				Arguments.of(atLeast(1), EMPTY, EMPTY),
				Arguments.of(atLeast(1), ALL, ALL),
				Arguments.of(atLeast(1), exactly(2), atLeast(3)),
				Arguments.of(between(1, 2), between(-3, 7), between(-2, 9)),
				Arguments.of(between(1, 2), EMPTY, EMPTY),
				Arguments.of(between(1, 2), ALL, ALL),
				Arguments.of(between(1, 2), atMost(7), atMost(9)),
				Arguments.of(between(1, 2), atLeast(-3), atLeast(-2)),
				Arguments.of(between(1, 2), exactly(-3), between(-2, -1))
		);
	}

	private static Stream<Arguments> symmetricTest(Collection<Arguments> inputs) {
		var symmetricInputs = new ArrayList<Arguments>(inputs.size() * 2);
		symmetricInputs.addAll(inputs);
		for (var input : inputs) {
			var arguments = input.get();
			if (!Objects.equals(arguments[0], arguments[1])) {
				symmetricInputs.add(Arguments.of(arguments[1], arguments[0], arguments[2]));
			}
		}
		return symmetricInputs.stream();
	}

	private static Stream<Arguments> symmetricTest(Arguments... inputs) {
		return symmetricTest(List.of(inputs));
	}

	@ParameterizedTest(name = "{0} - {1} == {2}")
	@MethodSource
	void subTest(IntInterval a, IntInterval b, IntInterval expected) {
		var actual = a.sub(b);
		assertThat(actual, is(expected));
	}

	static Stream<Arguments> subTest() {
		return Stream.of(
				Arguments.of(EMPTY, EMPTY, EMPTY),
				Arguments.of(ALL, EMPTY, EMPTY),
				Arguments.of(EMPTY, ALL, EMPTY),
				Arguments.of(ALL, ALL, ALL),
				Arguments.of(exactly(1), exactly(3), exactly(-2)),
				Arguments.of(EMPTY, exactly(1), EMPTY),
				Arguments.of(exactly(1), EMPTY, EMPTY),
				Arguments.of(ALL, exactly(1), ALL),
				Arguments.of(exactly(1), ALL, ALL),
				Arguments.of(atMost(1), atMost(3), ALL),
				Arguments.of(EMPTY, atMost(1), EMPTY),
				Arguments.of(atMost(1), EMPTY, EMPTY),
				Arguments.of(ALL, atMost(1), ALL),
				Arguments.of(atMost(1), ALL, ALL),
				Arguments.of(atLeast(1), atLeast(2), ALL),
				Arguments.of(EMPTY, atLeast(1), EMPTY),
				Arguments.of(atLeast(1), EMPTY, EMPTY),
				Arguments.of(ALL, atLeast(1), ALL),
				Arguments.of(atLeast(1), ALL, ALL),
				Arguments.of(between(1, 2), between(-3, 7), between(-6, 5)),
				Arguments.of(EMPTY, between(1, 2), EMPTY),
				Arguments.of(between(1, 2), EMPTY, EMPTY),
				Arguments.of(ALL, between(1, 2), ALL),
				Arguments.of(between(1, 2), ALL, ALL),
				Arguments.of(atMost(2), between(-3, 7), atMost(5)),
				Arguments.of(between(1, 2), atMost(7), atLeast(-6)),
				Arguments.of(atLeast(1), between(-3, 7), atLeast(-6)),
				Arguments.of(between(1, 2), atLeast(-3), atMost(5)),
				Arguments.of(atMost(2), atLeast(-3), atMost(5)),
				Arguments.of(atLeast(1), atMost(7), atLeast(-6)),
				Arguments.of(exactly(1), between(5, 7), between(-6, -4)),
				Arguments.of(between(5, 7), exactly(1), between(4, 6))
		);
	}

	@ParameterizedTest(name = "{0} \\/ {1} == {2}")
	@MethodSource
	void joinTest(IntInterval a, IntInterval b, IntInterval expected) {
		var actual = a.join(b);
		assertThat(actual, is(expected));
	}

	static Stream<Arguments> joinTest() {
		return symmetricTest(
				Arguments.of(EMPTY, EMPTY, EMPTY),
				Arguments.of(ALL, EMPTY, ALL),
				Arguments.of(ALL, ALL, ALL),
				Arguments.of(exactly(1), exactly(1), exactly(1)),
				Arguments.of(exactly(1), exactly(2), between(1, 2)),
				Arguments.of(exactly(1), EMPTY, exactly(1)),
				Arguments.of(exactly(1), ALL, ALL),
				Arguments.of(exactly(1), between(2, 3), between(1, 3)),
				Arguments.of(exactly(1), between(1, 3), between(1, 3)),
				Arguments.of(exactly(1), between(0, 2), between(0, 2)),
				Arguments.of(exactly(1), between(-1, 0), between(-1, 1)),
				Arguments.of(exactly(1), between(-1, 1), between(-1, 1)),
				Arguments.of(atMost(1), atMost(1), atMost(1)),
				Arguments.of(atMost(1), atMost(2), atMost(2)),
				Arguments.of(atMost(1), EMPTY, atMost(1)),
				Arguments.of(atMost(1), ALL, ALL),
				Arguments.of(atMost(2), atLeast(-3), ALL),
				Arguments.of(atMost(1), atLeast(1), ALL),
				Arguments.of(atMost(2), atLeast(3), ALL),
				Arguments.of(atLeast(1), atLeast(1), atLeast(1)),
				Arguments.of(atLeast(1), atLeast(2), atLeast(1)),
				Arguments.of(atLeast(1), EMPTY, atLeast(1)),
				Arguments.of(atLeast(1), ALL, ALL),
				Arguments.of(between(1, 2), between(1, 2), between(1, 2)),
				Arguments.of(between(1, 2), between(3, 4), between(1, 4)),
				Arguments.of(between(1, 2), between(2, 4), between(1, 4)),
				Arguments.of(between(1, 3), between(2, 4), between(1, 4)),
				Arguments.of(between(1, 4), between(2, 3), between(1, 4)),
				Arguments.of(between(1, 2), EMPTY, between(1, 2)),
				Arguments.of(between(1, 2), ALL, ALL),
				Arguments.of(between(1, 2), atMost(7), atMost(7)),
				Arguments.of(between(1, 2), atMost(1), atMost(2)),
				Arguments.of(between(1, 3), atMost(2), atMost(3)),
				Arguments.of(between(1, 2), atMost(-1), atMost(2)),
				Arguments.of(between(1, 2), atLeast(-3), atLeast(-3)),
				Arguments.of(between(1, 2), atLeast(2), atLeast(1)),
				Arguments.of(between(1, 3), atLeast(2), atLeast(1)),
				Arguments.of(between(1, 2), atLeast(3), atLeast(1))
		);
	}

	@ParameterizedTest(name = "{0} /\\ {1} == {2}")
	@MethodSource
	void meetTest(IntInterval a, IntInterval b, IntInterval expected) {
		var actual = a.meet(b);
		assertThat(actual, is(expected));
	}

	static Stream<Arguments> meetTest() {
		return symmetricTest(
				Arguments.of(EMPTY, EMPTY, EMPTY),
				Arguments.of(ALL, EMPTY, EMPTY),
				Arguments.of(ALL, ALL, ALL),
				Arguments.of(exactly(1), exactly(1), exactly(1)),
				Arguments.of(exactly(1), exactly(2), EMPTY),
				Arguments.of(exactly(1), EMPTY, EMPTY),
				Arguments.of(exactly(1), ALL, exactly(1)),
				Arguments.of(exactly(1), between(2, 3), EMPTY),
				Arguments.of(exactly(1), between(1, 3), exactly(1)),
				Arguments.of(exactly(1), between(0, 2), exactly(1)),
				Arguments.of(exactly(1), between(-1, 0), EMPTY),
				Arguments.of(exactly(1), between(-1, 1), exactly(1)),
				Arguments.of(atMost(1), atMost(1), atMost(1)),
				Arguments.of(atMost(1), atMost(2), atMost(1)),
				Arguments.of(atMost(1), EMPTY, EMPTY),
				Arguments.of(atMost(1), ALL, atMost(1)),
				Arguments.of(atMost(2), atLeast(-3), between(-3, 2)),
				Arguments.of(atMost(1), atLeast(1), exactly(1)),
				Arguments.of(atMost(2), atLeast(3), EMPTY),
				Arguments.of(atLeast(1), atLeast(1), atLeast(1)),
				Arguments.of(atLeast(1), atLeast(2), atLeast(2)),
				Arguments.of(atLeast(1), EMPTY, EMPTY),
				Arguments.of(atLeast(1), ALL, atLeast(1)),
				Arguments.of(between(1, 2), between(1, 2), between(1, 2)),
				Arguments.of(between(1, 2), between(3, 4), EMPTY),
				Arguments.of(between(1, 2), between(2, 4), exactly(2)),
				Arguments.of(between(1, 3), between(2, 4), between(2, 3)),
				Arguments.of(between(1, 4), between(2, 3), between(2, 3)),
				Arguments.of(between(1, 2), EMPTY, EMPTY),
				Arguments.of(between(1, 2), ALL, between(1, 2)),
				Arguments.of(between(1, 2), atMost(7), between(1, 2)),
				Arguments.of(between(1, 2), atMost(1), exactly(1)),
				Arguments.of(between(1, 3), atMost(2), between(1, 2)),
				Arguments.of(between(1, 2), atMost(-1), EMPTY),
				Arguments.of(between(1, 2), atLeast(-3), between(1, 2)),
				Arguments.of(between(1, 2), atLeast(2), exactly(2)),
				Arguments.of(between(1, 3), atLeast(2), between(2, 3)),
				Arguments.of(between(1, 2), atLeast(3), EMPTY)
		);
	}

	@ParameterizedTest(name = "min({0}, {1}) == {2}")
	@MethodSource
	void minTest(IntInterval a, IntInterval b, IntInterval expected) {
		var actual = a.min(b);
		assertThat(actual, is(expected));
	}

	static Stream<Arguments> minTest() {
		return symmetricTest(
				Arguments.of(EMPTY, EMPTY, EMPTY),
				Arguments.of(ALL, EMPTY, EMPTY),
				Arguments.of(ALL, ALL, ALL),
				Arguments.of(exactly(1), exactly(1), exactly(1)),
				Arguments.of(exactly(1), exactly(2), exactly(1)),
				Arguments.of(exactly(1), EMPTY, EMPTY),
				Arguments.of(exactly(1), ALL, atMost(1)),
				Arguments.of(exactly(1), between(2, 3), exactly(1)),
				Arguments.of(exactly(1), between(1, 3), exactly(1)),
				Arguments.of(exactly(1), between(0, 2), between(0, 1)),
				Arguments.of(exactly(1), between(-1, 0), between(-1, 0)),
				Arguments.of(exactly(1), between(-1, 1), between(-1, 1)),
				Arguments.of(atMost(1), atMost(1), atMost(1)),
				Arguments.of(atMost(1), atMost(2), atMost(1)),
				Arguments.of(atMost(1), EMPTY, EMPTY),
				Arguments.of(atMost(1), ALL, atMost(1)),
				Arguments.of(atMost(2), atLeast(-3), atMost(2)),
				Arguments.of(atMost(1), atLeast(1), atMost(1)),
				Arguments.of(atMost(2), atLeast(3), atMost(2)),
				Arguments.of(atLeast(1), atLeast(1), atLeast(1)),
				Arguments.of(atLeast(1), atLeast(2), atLeast(1)),
				Arguments.of(atLeast(1), EMPTY, EMPTY),
				Arguments.of(atLeast(1), ALL, ALL),
				Arguments.of(between(1, 2), between(1, 2), between(1, 2)),
				Arguments.of(between(1, 2), between(3, 4), between(1, 2)),
				Arguments.of(between(1, 2), between(2, 4), between(1, 2)),
				Arguments.of(between(1, 3), between(2, 4), between(1, 3)),
				Arguments.of(between(1, 4), between(2, 3), between(1, 3)),
				Arguments.of(between(1, 2), EMPTY, EMPTY),
				Arguments.of(between(1, 2), ALL, atMost(2)),
				Arguments.of(between(1, 2), atMost(7), atMost(2)),
				Arguments.of(between(1, 2), atMost(1), atMost(1)),
				Arguments.of(between(1, 3), atMost(2), atMost(2)),
				Arguments.of(between(1, 2), atMost(-1), atMost(-1)),
				Arguments.of(between(1, 2), atLeast(-3), between(-3, 2)),
				Arguments.of(between(1, 2), atLeast(2), between(1, 2)),
				Arguments.of(between(1, 3), atLeast(2), between(1, 3)),
				Arguments.of(between(1, 2), atLeast(3), between(1, 2))
		);
	}

	@ParameterizedTest(name = "max({0}, {1}) == {2}")
	@MethodSource
	void maxTest(IntInterval a, IntInterval b, IntInterval expected) {
		var actual = a.max(b);
		assertThat(actual, is(expected));
	}

	static Stream<Arguments> maxTest() {
		return symmetricTest(
				Arguments.of(EMPTY, EMPTY, EMPTY),
				Arguments.of(ALL, EMPTY, EMPTY),
				Arguments.of(ALL, ALL, ALL),
				Arguments.of(exactly(1), exactly(1), exactly(1)),
				Arguments.of(exactly(1), exactly(2), exactly(2)),
				Arguments.of(exactly(1), EMPTY, EMPTY),
				Arguments.of(exactly(1), ALL, atLeast(1)),
				Arguments.of(exactly(1), between(2, 3), between(2, 3)),
				Arguments.of(exactly(1), between(1, 3), between(1, 3)),
				Arguments.of(exactly(1), between(0, 2), between(1, 2)),
				Arguments.of(exactly(1), between(-1, 0), exactly(1)),
				Arguments.of(exactly(1), between(-1, 1), exactly(1)),
				Arguments.of(atMost(1), atMost(1), atMost(1)),
				Arguments.of(atMost(1), atMost(2), atMost(2)),
				Arguments.of(atMost(1), EMPTY, EMPTY),
				Arguments.of(atMost(1), ALL, ALL),
				Arguments.of(atMost(2), atLeast(-3), atLeast(-3)),
				Arguments.of(atMost(1), atLeast(1), atLeast(1)),
				Arguments.of(atMost(2), atLeast(3), atLeast(3)),
				Arguments.of(atLeast(1), atLeast(1), atLeast(1)),
				Arguments.of(atLeast(1), atLeast(2), atLeast(2)),
				Arguments.of(atLeast(1), EMPTY, EMPTY),
				Arguments.of(atLeast(1), ALL, atLeast(1)),
				Arguments.of(between(1, 2), between(1, 2), between(1, 2)),
				Arguments.of(between(1, 2), between(3, 4), between(3, 4)),
				Arguments.of(between(1, 2), between(2, 4), between(2, 4)),
				Arguments.of(between(1, 3), between(2, 4), between(2, 4)),
				Arguments.of(between(1, 4), between(2, 3), between(2, 4)),
				Arguments.of(between(1, 2), EMPTY, EMPTY),
				Arguments.of(between(1, 2), ALL, atLeast(1)),
				Arguments.of(between(1, 2), atMost(7), between(1, 7)),
				Arguments.of(between(1, 2), atMost(1), between(1, 2)),
				Arguments.of(between(1, 3), atMost(2), between(1, 3)),
				Arguments.of(between(1, 2), atMost(-1), between(1, 2)),
				Arguments.of(between(1, 2), atLeast(-3), atLeast(1)),
				Arguments.of(between(1, 2), atLeast(2), atLeast(2)),
				Arguments.of(between(1, 3), atLeast(2), atLeast(2)),
				Arguments.of(between(1, 2), atLeast(3), atLeast(3))
		);
	}

	@ParameterizedTest(name = "{0} * {1} == {2}")
	@MethodSource
	void mulTest(IntInterval a, IntInterval b, IntInterval expected) {
		var actual = a.mul(b);
		assertThat(actual, is(expected));
	}

	static Stream<Arguments> mulTest() {
		return symmetricTest(
				Arguments.of(EMPTY, EMPTY, EMPTY),
				Arguments.of(ALL, EMPTY, EMPTY),
				Arguments.of(ALL, ALL, ALL),
				Arguments.of(exactly(2), EMPTY, EMPTY),
				Arguments.of(exactly(2), ALL, ALL),
				Arguments.of(exactly(2), exactly(-3), exactly(-6)),
				Arguments.of(exactly(0), EMPTY, EMPTY),
				Arguments.of(exactly(0), ALL, exactly(0)),
				Arguments.of(exactly(-2), EMPTY, EMPTY),
				Arguments.of(exactly(-2), ALL, ALL),
				Arguments.of(atMost(-2), exactly(-3), atLeast(6)),
				Arguments.of(atMost(-2), exactly(0), exactly(0)),
				Arguments.of(atMost(-2), exactly(3), atMost(-6)),
				Arguments.of(atMost(-2), atMost(-3), atLeast(6)),
				Arguments.of(atMost(-2), atMost(0), atLeast(0)),
				Arguments.of(atMost(-2), atMost(3), ALL),
				Arguments.of(atMost(-2), atLeast(-3), ALL),
				Arguments.of(atMost(-2), atLeast(0), atMost(0)),
				Arguments.of(atMost(-2), atLeast(3), atMost(-6)),
				Arguments.of(atMost(-2), between(-7, -5), atLeast(10)),
				Arguments.of(atMost(-2), between(-7, 0), atLeast(0)),
				Arguments.of(atMost(-2), between(-7, 5), ALL),
				Arguments.of(atMost(-2), between(0, 5), atMost(0)),
				Arguments.of(atMost(-2), between(5, 7), atMost(-10)),
				Arguments.of(atMost(-2), EMPTY, EMPTY),
				Arguments.of(atMost(-2), ALL, ALL),
				Arguments.of(atMost(0), exactly(-3), atLeast(0)),
				Arguments.of(atMost(0), exactly(0), exactly(0)),
				Arguments.of(atMost(0), exactly(3), atMost(0)),
				Arguments.of(atMost(0), atMost(0), atLeast(0)),
				Arguments.of(atMost(0), atLeast(-3), ALL),
				Arguments.of(atMost(0), atLeast(0), atMost(0)),
				Arguments.of(atMost(0), atLeast(3), atMost(0)),
				Arguments.of(atMost(0), between(-7, -5), atLeast(0)),
				Arguments.of(atMost(0), between(-7, 0), atLeast(0)),
				Arguments.of(atMost(0), between(-7, 5), ALL),
				Arguments.of(atMost(0), between(0, 5), atMost(0)),
				Arguments.of(atMost(0), between(5, 7), atMost(0)),
				Arguments.of(atMost(0), EMPTY, EMPTY),
				Arguments.of(atMost(0), ALL, ALL),
				Arguments.of(atMost(2), exactly(-3), atLeast(-6)),
				Arguments.of(atMost(2), exactly(0), exactly(0)),
				Arguments.of(atMost(2), exactly(3), atMost(6)),
				Arguments.of(atMost(2), atMost(3), ALL),
				Arguments.of(atMost(2), atLeast(-3), ALL),
				Arguments.of(atMost(2), atLeast(0), ALL),
				Arguments.of(atMost(2), atLeast(3), ALL),
				Arguments.of(atMost(2), between(-7, -5), atLeast(-14)),
				Arguments.of(atMost(2), between(-7, 0), atLeast(-14)),
				Arguments.of(atMost(2), between(-7, 5), ALL),
				Arguments.of(atMost(2), between(0, 5), atMost(10)),
				Arguments.of(atMost(2), between(5, 7), atMost(14)),
				Arguments.of(atMost(2), EMPTY, EMPTY),
				Arguments.of(atMost(2), ALL, ALL),
				Arguments.of(atLeast(-2), exactly(-3), atMost(6)),
				Arguments.of(atLeast(-2), exactly(0), exactly(0)),
				Arguments.of(atLeast(-2), exactly(3), atLeast(-6)),
				Arguments.of(atLeast(-2), atMost(3), ALL),
				Arguments.of(atLeast(-2), atLeast(-3), ALL),
				Arguments.of(atLeast(-2), atLeast(0), ALL),
				Arguments.of(atLeast(-2), atLeast(3), ALL),
				Arguments.of(atLeast(-2), between(-7, -5), atMost(14)),
				Arguments.of(atLeast(-2), between(-7, 0), atMost(14)),
				Arguments.of(atLeast(-2), between(-7, 5), ALL),
				Arguments.of(atLeast(-2), between(0, 5), atLeast(-10)),
				Arguments.of(atLeast(-2), between(5, 7), atLeast(-14)),
				Arguments.of(atLeast(-2), EMPTY, EMPTY),
				Arguments.of(atLeast(-2), ALL, ALL),
				Arguments.of(atLeast(0), exactly(-3), atMost(0)),
				Arguments.of(atLeast(0), exactly(0), exactly(0)),
				Arguments.of(atLeast(0), exactly(3), atLeast(0)),
				Arguments.of(atLeast(0), atLeast(0), atLeast(0)),
				Arguments.of(atLeast(0), atLeast(3), atLeast(0)),
				Arguments.of(atLeast(0), between(-7, -5), atMost(0)),
				Arguments.of(atLeast(0), between(-7, 0), atMost(0)),
				Arguments.of(atLeast(0), between(-7, 5), ALL),
				Arguments.of(atLeast(0), between(0, 5), atLeast(0)),
				Arguments.of(atLeast(0), between(5, 7), atLeast(0)),
				Arguments.of(atLeast(0), EMPTY, EMPTY),
				Arguments.of(atLeast(0), ALL, ALL),
				Arguments.of(atLeast(2), exactly(-3), atMost(-6)),
				Arguments.of(atLeast(2), exactly(0), exactly(0)),
				Arguments.of(atLeast(2), exactly(3), atLeast(6)),
				Arguments.of(atLeast(2), atLeast(3), atLeast(6)),
				Arguments.of(atLeast(2), between(-7, -5), atMost(-10)),
				Arguments.of(atLeast(2), between(-7, 0), atMost(0)),
				Arguments.of(atLeast(2), between(-7, 5), ALL),
				Arguments.of(atLeast(2), between(0, 5), atLeast(0)),
				Arguments.of(atLeast(2), between(5, 7), atLeast(10)),
				Arguments.of(atLeast(2), EMPTY, EMPTY),
				Arguments.of(atLeast(2), ALL, ALL),
				Arguments.of(between(-4, -2), between(-7, -5), between(10, 28)),
				Arguments.of(between(-4, -2), between(-7, -3), between(6, 28)),
				Arguments.of(between(-4, -2), between(-3, -1), between(2, 12)),
				Arguments.of(between(-4, -2), between(-3, 0), between(0, 12)),
				Arguments.of(between(-4, -2), between(-3, 1), between(-4, 12)),
				Arguments.of(between(-4, -2), between(0, 1), between(-4, 0)),
				Arguments.of(between(-4, -2), between(1, 3), between(-12, -2)),
				Arguments.of(between(-4, -2), exactly(-3), between(6, 12)),
				Arguments.of(between(-4, -2), exactly(0), exactly(0)),
				Arguments.of(between(-4, -2), exactly(3), between(-12, -6)),
				Arguments.of(between(-4, -2), EMPTY, EMPTY),
				Arguments.of(between(-4, -2), ALL, ALL),
				Arguments.of(between(-4, 0), between(-7, -5), between(0, 28)),
				Arguments.of(between(-4, 0), between(-3, -1), between(0, 12)),
				Arguments.of(between(-4, 0), between(-3, 0), between(0, 12)),
				Arguments.of(between(-4, 0), between(-3, 1), between(-4, 12)),
				Arguments.of(between(-4, 0), between(0, 1), between(-4, 0)),
				Arguments.of(between(-4, 0), between(1, 3), between(-12, 0)),
				Arguments.of(between(-4, 0), exactly(-3), between(0, 12)),
				Arguments.of(between(-4, 0), exactly(0), exactly(0)),
				Arguments.of(between(-4, 0), exactly(3), between(-12, 0)),
				Arguments.of(between(-4, 0), EMPTY, EMPTY),
				Arguments.of(between(-4, 0), ALL, ALL),
				Arguments.of(between(-4, 2), between(-7, -5), between(-14, 28)),
				Arguments.of(between(-4, 2), between(-3, -1), between(-6, 12)),
				Arguments.of(between(-4, 2), between(-3, 0), between(-6, 12)),
				Arguments.of(between(-4, 2), between(-3, 5), between(-20, 12)),
				Arguments.of(between(-4, 2), between(0, 5), between(-20, 10)),
				Arguments.of(between(-4, 2), between(3, 5), between(-20, 10)),
				Arguments.of(between(-4, 2), exactly(-3), between(-6, 12)),
				Arguments.of(between(-4, 2), exactly(0), exactly(0)),
				Arguments.of(between(-4, 2), exactly(3), between(-12, 6)),
				Arguments.of(between(-4, 2), EMPTY, EMPTY),
				Arguments.of(between(-4, 2), ALL, ALL),
				Arguments.of(between(0, 2), between(-7, -5), between(-14, 0)),
				Arguments.of(between(0, 2), between(-7, 0), between(-14, 0)),
				Arguments.of(between(0, 2), between(0, 2), between(0, 4)),
				Arguments.of(between(0, 2), between(1, 3), between(0, 6)),
				Arguments.of(between(0, 2), between(2, 4), between(0, 8)),
				Arguments.of(between(0, 2), between(3, 5), between(0, 10)),
				Arguments.of(between(0, 2), exactly(-3), between(-6, 0)),
				Arguments.of(between(0, 2), exactly(0), exactly(0)),
				Arguments.of(between(0, 2), exactly(3), between(0, 6)),
				Arguments.of(between(0, 2), EMPTY, EMPTY),
				Arguments.of(between(0, 2), ALL, ALL),
				Arguments.of(between(2, 4), between(-7, -5), between(-28, -10)),
				Arguments.of(between(2, 4), between(-7, 0), between(-28, 0)),
				Arguments.of(between(2, 4), between(-7, 1), between(-28, 4)),
				Arguments.of(between(2, 4), between(-7, 3), between(-28, 12)),
				Arguments.of(between(2, 4), between(0, 3), between(0, 12)),
				Arguments.of(between(2, 4), between(3, 5), between(6, 20)),
				Arguments.of(between(2, 4), between(5, 7), between(10, 28)),
				Arguments.of(between(2, 4), exactly(-3), between(-12, -6)),
				Arguments.of(between(2, 4), exactly(0), exactly(0)),
				Arguments.of(between(2, 4), exactly(3), between(6, 12)),
				Arguments.of(between(2, 4), EMPTY, EMPTY),
				Arguments.of(between(2, 4), ALL, ALL)
		);
	}
}
