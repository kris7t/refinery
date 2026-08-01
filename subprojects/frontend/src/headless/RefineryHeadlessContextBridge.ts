/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

export type RequestCallback = (body: Uint8Array) => Promise<Uint8Array>;

export default interface RefineryHeadlessContextBridge {
  onRequest(callback: RequestCallback): void;
}
