/*
 * SPDX-FileCopyrightText: 2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { Visibility } from '@tools.refinery/client';

import getLogger from '../utils/getLogger';
import isElectron from '../utils/isElectron';

import {
  type CompressRequest,
  CompressorResponse,
  type CompressorVersion,
  type DecompressRequest,
  V2Payload,
} from './compressionMessages';
import CompressionWorker from './compressionWorker?worker';
import initialValue from './initialValue';

const LOG = getLogger('persistence.Compressor');

const FRAGMENT_PREFIX_V1 = '#/1/';

const FRAGMENT_PREFIX_V2 = '#/2/';

export type DecompressCallback = (
  text: string,
  visibility?: Record<string, Visibility>,
) => void;

interface CompressionInput {
  version: CompressorVersion;
  text: string;
}

function createCompressionInput(
  text: string,
  visibility?: Record<string, Visibility>,
): CompressionInput {
  if (visibility === undefined || Object.keys(visibility).length === 0) {
    return { version: 1, text };
  }
  const payload = {
    t: text,
    v: visibility,
  } satisfies V2Payload;
  return { version: 2, text: JSON.stringify(payload) };
}

function sameCompressionInput(
  left: CompressionInput | undefined,
  right: CompressionInput,
): boolean {
  return left?.version === right.version && left.text === right.text;
}

function toFragment(version: CompressorVersion, value: string): string {
  switch (version) {
    case 1:
      return `${FRAGMENT_PREFIX_V1}${value}`;
    case 2:
      return `${FRAGMENT_PREFIX_V2}${value}`;
    default:
      throw new Error(`Unsupported compressor version: ${String(version)}`);
  }
}

function fromFragment(
  fragment: string,
): { version: CompressorVersion; text: string } | undefined {
  if (fragment.startsWith(FRAGMENT_PREFIX_V1)) {
    return { version: 1, text: fragment.slice(FRAGMENT_PREFIX_V1.length) };
  }
  if (fragment.startsWith(FRAGMENT_PREFIX_V2)) {
    return { version: 2, text: fragment.slice(FRAGMENT_PREFIX_V2.length) };
  }
  return undefined;
}

export default class Compressor {
  private worker: Worker | undefined;

  private readonly hashChangeHandler = () => this.updateHash();

  private fragment: string | undefined;

  private fragmentInput: CompressionInput | undefined;

  private compressingInput: CompressionInput | undefined;

  private toCompress: CompressionInput | undefined;

  constructor(private readonly onDecompressed: DecompressCallback) {
    if (!isElectron) {
      window.addEventListener('hashchange', this.hashChangeHandler);
    }
  }

  private getWorker(): Worker {
    if (this.worker !== undefined) {
      return this.worker;
    }
    const worker = new CompressionWorker();
    worker.onerror = (err) => LOG.error({ err }, 'Worker error');
    worker.onmessageerror = (err: unknown) =>
      LOG.error({ err }, 'Worker message error');
    worker.onmessage = (event) => {
      try {
        const message = CompressorResponse.parse(event.data);
        switch (message.response) {
          case 'compressed':
            if (this.compressingInput?.version !== message.version) {
              throw new Error('Unexpected compressed response');
            }
            this.setCompressedFragment(
              this.compressingInput,
              message.compressedText,
              true,
            );
            this.compressionEnded();
            break;
          case 'decompressed':
            this.processDecompressed(message.version, message.text);
            break;
          case 'error':
            this.compressionEnded();
            LOG.error(
              { message: message.message },
              'Error processing compressor request',
            );
            break;
          default:
            LOG.error(
              { data: event.data as unknown },
              'Unknown response from compressor worker',
            );
            break;
        }
      } catch (err) {
        LOG.error({ err }, 'Error processing worker message');
      }
    };
    this.worker = worker;
    return worker;
  }

  decompressInitial(fragment = window.location.hash): void {
    this.updateFragment(fragment);
    if (this.fragment === undefined) {
      LOG.debug('Loading default source');
      this.onDecompressed(initialValue);
    }
  }

  compress(text: string, visibility?: Record<string, Visibility>): void {
    if (isElectron) {
      // No hash-based links in Electron, so no need to run the compressor.
      return;
    }
    this.doCompress(createCompressionInput(text, visibility));
  }

  getShareFragment(
    text: string,
    visibility?: Record<string, Visibility>,
  ): Promise<string> {
    const input = createCompressionInput(text, visibility);
    if (
      this.fragment !== undefined &&
      sameCompressionInput(this.fragmentInput, input)
    ) {
      return Promise.resolve(this.fragment);
    }
    return new Promise((resolve, reject) => {
      const worker = new CompressionWorker();
      const fail = (error: unknown) => {
        worker.terminate();
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      worker.onerror = (event) => fail(new Error(event.message));
      worker.onmessageerror = () =>
        fail(new Error('Failed to receive compressor worker message'));
      worker.onmessage = (event) => {
        try {
          const message = CompressorResponse.parse(event.data);
          if (message.response === 'error') {
            fail(new Error(message.message));
          } else if (
            message.response !== 'compressed' ||
            message.version !== input.version
          ) {
            fail(new Error('Unexpected compressor worker response'));
          } else {
            const fragment = this.setCompressedFragment(
              input,
              message.compressedText,
              !isElectron,
            );
            worker.terminate();
            resolve(fragment);
          }
        } catch (error) {
          fail(error);
        }
      };
      worker.postMessage({
        request: 'compress',
        text: input.text,
        version: input.version,
      } satisfies CompressRequest);
    });
  }

  private setCompressedFragment(
    input: CompressionInput,
    compressedText: string,
    updateLocation: boolean,
  ): string {
    const fragment = toFragment(input.version, compressedText);
    this.fragment = fragment;
    this.fragmentInput = input;
    if (updateLocation) {
      window.history.replaceState(null, '', fragment);
    }
    return fragment;
  }

  private doCompress(input: CompressionInput): void {
    this.toCompress = input;
    if (this.compressingInput !== undefined) {
      return;
    }
    this.compressingInput = input;
    this.toCompress = undefined;
    this.getWorker().postMessage({
      request: 'compress',
      text: input.text,
      version: input.version,
    } satisfies CompressRequest);
  }

  private processDecompressed(version: CompressorVersion, text: string): void {
    if (version === 1) {
      this.fragmentInput = { version, text };
      this.onDecompressed(text);
      return;
    }
    let payload: V2Payload;
    try {
      payload = V2Payload.parse(JSON.parse(text));
    } catch (err) {
      LOG.error({ err }, 'Failed to parse URI fragment payload');
      return;
    }
    this.fragmentInput = { version, text };
    this.onDecompressed(payload.t, payload.v);
  }

  dispose(): void {
    window.removeEventListener('hashchange', this.hashChangeHandler);
    this.worker?.terminate();
  }

  private compressionEnded(): void {
    this.compressingInput = undefined;
    const nextInput = this.toCompress;
    this.toCompress = undefined;
    if (nextInput !== undefined) {
      this.doCompress(nextInput);
    }
  }

  private updateHash(): void {
    this.updateFragment(window.location.hash);
  }

  private updateFragment(fragment: string): void {
    if (fragment === this.fragment) {
      return;
    }
    const result = fromFragment(fragment);
    if (result === undefined) {
      return;
    }
    this.fragment = fragment;
    this.fragmentInput = undefined;
    this.getWorker().postMessage({
      request: 'decompress',
      compressedText: result.text,
      version: result.version,
    } satisfies DecompressRequest);
  }
}
