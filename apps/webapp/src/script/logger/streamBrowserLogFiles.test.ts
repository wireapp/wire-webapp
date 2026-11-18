/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {Blob as NodeBlob} from 'node:buffer';
import {ReadableStream as NodeReadableStream} from 'node:stream/web';

import {unwrap, unwrapErr} from '../util/test/resultTestSupport';

import type {BrowserLogArchiveEntry, BrowserLogExportDirectory, BrowserLogExportFile} from './browserLogExportTypes';
import {logDirectoryName} from './logPersistenceConfiguration';
import {browserLogExportChunkBytes, streamBrowserLogFiles} from './streamBrowserLogFiles';

const originalReadableStream = Object.getOwnPropertyDescriptor(globalThis, 'ReadableStream');
const filename = 'log-1000-00000000-0000-4000-8000-000000000001-1.jsonl';

describe('OPFS browser log export source', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'ReadableStream', {configurable: true, value: NodeReadableStream});
  });
  afterAll(() => {
    if (originalReadableStream === undefined) {
      Reflect.deleteProperty(globalThis, 'ReadableStream');
    } else {
      Object.defineProperty(globalThis, 'ReadableStream', originalReadableStream);
    }
  });

  it('streams bounded slices to an injected archive and checks the original file handle afterward', async () => {
    const contents = '{ "message": "Preserve original formatting 🌍" }\n'.repeat(5000);
    const blob = new NodeBlob([contents]);
    const readSizes: number[] = [];
    const events: string[] = [];
    const archivedChunks: Uint8Array[] = [];
    const file: BrowserLogExportFile = {
      size: blob.size,
      lastModified: 1000,
      slice(start, end) {
        const slice = blob.slice(start, end);
        readSizes.push(slice.size);

        return slice as Blob;
      },
    };
    const fileHandle = {
      async getFile() {
        // Native OPFS methods require their original receiver.
        expect(this).toBe(fileHandle);
        events.push('get-file');

        return file;
      },
    };
    const directory: BrowserLogExportDirectory = {
      async getDirectoryHandle(name, options) {
        expect(name).toBe(logDirectoryName);
        expect(options).toEqual({create: false});

        return directory;
      },
      async *values() {
        yield {kind: 'file', name: filename};
      },
      async getFileHandle(name) {
        expect(name).toBe(filename);

        return fileHandle;
      },
    };
    const completion = await streamBrowserLogFiles({
      async getDirectory() {
        return directory;
      },
      archive: {
        async addFile(options: BrowserLogArchiveEntry) {
          expect(options.filename).toBe('1970-01-01/application.jsonl');
          const reader = options.readable.getReader();
          try {
            while (true) {
              const chunk = await reader.read();
              if (chunk.done) {
                break;
              }
              archivedChunks.push(chunk.value);
            }
          } finally {
            reader.releaseLock();
          }
          events.push('archive-entry-complete');
        },
      },
      signal: new AbortController().signal,
    });

    expect(unwrap(completion)).toEqual({exportedFiles: 1, missingFiles: 0});
    expect(Buffer.concat(archivedChunks).toString('utf8')).toBe(contents);
    expect(readSizes.length).toBeGreaterThan(1);
    expect(Math.max(...readSizes)).toBeLessThanOrEqual(browserLogExportChunkBytes);
    expect(events).toEqual(['get-file', 'archive-entry-complete', 'get-file']);
  });

  it('closes directory enumeration and stops opening files after a storage failure', async () => {
    const events: string[] = [];
    const addFile = jest.fn();
    const directory: BrowserLogExportDirectory = {
      async getDirectoryHandle() {
        return directory;
      },
      async *values() {
        try {
          yield {kind: 'file', name: filename};
          yield {kind: 'file', name: filename.replace('-1.jsonl', '-2.jsonl')};
        } finally {
          events.push('enumeration-closed');
        }
      },
      async getFileHandle(name) {
        events.push(name);

        throw new Error('account-secret: private contents');
      },
    };
    const completion = await streamBrowserLogFiles({
      async getDirectory() {
        return directory;
      },
      archive: {addFile},
      signal: new AbortController().signal,
    });

    expect(unwrapErr(completion)).toBe('failed');
    expect(addFile).not.toHaveBeenCalled();
    expect(events).toEqual(['enumeration-closed', filename]);
  });

  it('closes directory enumeration on cancellation before opening any files', async () => {
    const cancellation = new AbortController();
    const enumerationClosed = jest.fn();
    const getFileHandle = jest.fn();
    const addFile = jest.fn();
    const directory: BrowserLogExportDirectory = {
      async getDirectoryHandle() {
        return directory;
      },
      async *values() {
        try {
          yield {kind: 'file', name: filename};
          cancellation.abort();
          yield {kind: 'file', name: filename.replace('-1.jsonl', '-2.jsonl')};
        } finally {
          enumerationClosed();
        }
      },
      getFileHandle,
    };
    const result = await streamBrowserLogFiles({
      async getDirectory() {
        return directory;
      },
      archive: {addFile},
      signal: cancellation.signal,
    });

    expect(unwrapErr(result)).toBe('cancelled');
    expect(enumerationClosed).toHaveBeenCalledTimes(1);
    expect(getFileHandle).not.toHaveBeenCalled();
    expect(addFile).not.toHaveBeenCalled();
  });
});
