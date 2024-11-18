/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

interface Window {
  readonly refineryEclipseHostAPI?: (data: string) => string | null;

  refineryEclipsePageAPI?: (data: unknown) => void;

  refineryEclipsePageStart?: () => void;
}
