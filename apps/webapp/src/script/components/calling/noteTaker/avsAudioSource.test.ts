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

import {readFileSync} from 'node:fs';
import {createContext, runInContext} from 'node:vm';

// Exercise the installed patch, including its embedded worker, so reinstalling without it fails this suite.
const pcSource = readFileSync(require.resolve('@wireapp/avs/dist/avs_pc.js'), 'utf8');
const workerLine = pcSource.split('\n').find(line => {
  return line.startsWith('var workerContent = ');
});
if (!workerLine) {
  throw new Error('AVS embedded worker missing');
}
const workerSource: string = JSON.parse(workerLine.slice('var workerContent = '.length, -1));

describe('experimental AVS audio identity hook', () => {
  const buildWorker = (): {
    receive: (source?: number) => Promise<void>;
    identities: () => Record<string, unknown>[];
    decrypt: jest.Mock;
  } => {
    const messages = jest.fn();
    const decrypt = jest.fn().mockResolvedValue(new ArrayBuffer(4));
    const context = createContext({postMessage: messages, crypto: {subtle: {decrypt}}, console});
    runInContext(workerSource, context);
    const user = (userid: string): {userid: string; clientid: string; iva: Uint8Array; ivv: Uint8Array} => {
      return {
        userid,
        clientid: `client-${userid}`,
        iva: new Uint8Array(12),
        ivv: new Uint8Array(12),
      };
    };
    const coder = {self: 7, keys: [{id: 1, key: {}}], audio: {users: {'42': user('Bob'), '99': user('Carol')}}};
    const receive = async (source = 42): Promise<void> => {
      const header = context.frameHeaderEncode(1, 1, source) as Uint8Array;
      const frame = {
        data: Uint8Array.from([...header, 0]).buffer,
        getMetadata: () => {
          return {synchronizationSource: 123, contributingSources: []};
        },
        [Symbol.toStringTag]: 'RTCEncodedAudioFrame',
      };
      context.decryptFrame('receiver-1', coder, frame, {enqueue: jest.fn()});
      await Promise.resolve();
      await Promise.resolve();
    };
    const identities = (): Record<string, unknown>[] => {
      return messages.mock.calls
        .map(([message]) => {
          return message;
        })
        .filter(message => {
          return message.op === 'audioSource';
        });
    };
    return {receive, identities, decrypt};
  };

  it('maps authenticated audio frames to users and reports source switches without repeating every frame', async () => {
    const {receive, identities} = buildWorker();
    await receive(42);
    await receive(42);
    await receive(99);
    expect(identities()).toEqual([
      {op: 'audioSource', self: 7, track_id: 'receiver-1', userid: 'Bob', clientid: 'client-Bob'},
      {op: 'audioSource', self: 7, track_id: 'receiver-1', userid: 'Carol', clientid: 'client-Carol'},
    ]);
  });

  it('does not publish an identity when authentication fails', async () => {
    const {receive, identities, decrypt} = buildWorker();
    decrypt.mockRejectedValue(new Error('authentication failed'));
    await receive();
    expect(identities()).toEqual([]);
  });

  it('extends the stream callback with sender metadata only when opted in', () => {
    const handler = jest.fn();
    const context = createContext({
      exports: {},
      require: () => {
        return {};
      },
      Blob,
      URL: {
        createObjectURL: () => {
          return 'blob:test';
        },
      },
      Worker: jest.fn().mockImplementation(() => {
        return {};
      }),
    });
    runInContext(pcSource, context);
    const streams = [{}];
    context.connectionsStore = {
      getPeerConnectionBySelf: () => {
        return [
          {
            convid: 'conversation',
            rtc: {},
            audioStreams: {'receiver-1': {streamId: 'original-stream', streams, track: {readyState: 'live'}}},
          },
        ];
      },
    };
    context.exports.default.setAudioStreamHandler(handler);
    context.createWorker();
    context.worker.onmessage({
      data: {op: 'audioSource', self: 7, track_id: 'receiver-1', userid: 'Bob', clientid: 'client-Bob'},
    });
    expect(handler).not.toHaveBeenCalled();
    context.exports.default.setAudioStreamHandler(handler, true);
    context.worker.onmessage({
      data: {op: 'audioSource', self: 7, track_id: 'receiver-1', userid: 'Bob', clientid: 'client-Bob'},
    });
    expect(handler).toHaveBeenCalledWith('conversation', 'original-stream', streams, {
      trackId: 'receiver-1',
      userId: 'Bob',
      clientId: 'client-Bob',
    });
  });

  it('forwards peer identity for direct calls when the identity arrives after the track', () => {
    const handler = jest.fn();
    const context = createContext({
      exports: {},
      require: () => {
        return {};
      },
    });
    runInContext(pcSource, context);
    context.em_module = {
      UTF8ToString: (pointer: number) => {
        return pointer === 1 ? 'Bob' : 'client-Bob';
      },
    };
    context.connectionsStore = {
      getPeerConnection: () => {
        return {
          convid: 'conversation',
          conv_type: 0,
          rtc: {},
          audioStreams: {'receiver-1': {streamId: 'original-stream', streams: [], track: {readyState: 'live'}}},
        };
      },
    };
    context.exports.default.setAudioStreamHandler(handler, true);
    context.pc_SetRemoteUserClientId(7, 1, 2);
    expect(handler).toHaveBeenCalledWith('conversation', 'original-stream', [], {
      trackId: 'receiver-1',
      userId: 'Bob',
      clientId: 'client-Bob',
    });
  });
});
