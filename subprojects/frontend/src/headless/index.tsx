/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { JsonOutput } from '@tools.refinery/client';

if ('refineryHeadless' in window) {
  window.refineryHeadless.onRequest((request) => {
    const [a1, a2, a3, a4] = request;
    if (
      a1 === undefined ||
      a2 === undefined ||
      a3 === undefined ||
      a4 === undefined
    ) {
      throw new Error('Message too short');
    }
    const headerLength = (a1 << 24) | (a2 << 16) | (a3 << 8) | a4;
    const decoder = new TextDecoder();
    const header = JSON.parse(
      decoder.decode(request.slice(4, 4 + headerLength)),
    ) as undefined;
    const body = JsonOutput.parse(
      JSON.parse(decoder.decode(request.slice(4 + headerLength))),
    );
    const encoder = new TextEncoder();
    const responseHeader = encoder.encode(
      JSON.stringify({ result: 'success' }),
    );
    const responseBody = encoder.encode(
      JSON.stringify({
        header,
        body,
      }),
    );
    const responseHeaderLength = responseHeader.length;
    const response = new Uint8Array(
      4 + responseHeaderLength + responseBody.length,
    );
    response[0] = (responseHeaderLength >> 24) & 0xff;
    response[1] = (responseHeaderLength >> 16) & 0xff;
    response[2] = (responseHeaderLength >> 8) & 0xff;
    response[3] = responseHeaderLength & 0xff;
    response.set(responseHeader, 4);
    response.set(responseBody, 4 + responseHeaderLength);
    return Promise.resolve(response);
  });
}
