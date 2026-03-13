/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 */

import {GenericMessageType} from '../GenericMessageType';
import {
  attachThreadIdToMessage,
  buildFileMetaDataMessage,
  buildMultipartMessage,
  buildPingMessage,
  buildTextMessage,
  UnsupportedThreadPayloadError,
} from './MessageBuilder';

describe('MessageBuilder threading support', () => {
  it('sets threadId on text payloads', () => {
    const message = buildTextMessage({text: 'hello thread'}, 'text-1', 'root-1');
    const textPayload = message.text as {threadId?: string; thread_id?: string};

    expect(message.content).toBe(GenericMessageType.TEXT);
    expect(textPayload.threadId ?? textPayload.thread_id).toBe('root-1');
    expect(message.text?.content).toBe('hello thread');
  });

  it('sets threadId on multipart outer payload and keeps nested text untouched', () => {
    const message = buildMultipartMessage([], {text: 'multipart body'}, 'multipart-1', 'root-2');
    const multipartPayload = message.multipart as {threadId?: string; thread_id?: string};

    expect(message.content).toBe(GenericMessageType.MULTIPART);
    expect(multipartPayload.threadId ?? multipartPayload.thread_id).toBe('root-2');
    expect((message.multipart?.text as {threadId?: string} | undefined)?.threadId).toBeUndefined();
  });

  it('sets threadId on asset payloads', () => {
    const message = buildFileMetaDataMessage(
      {
        metaData: {
          audio: null,
          image: null,
          length: 5,
          name: 'file.txt',
          type: 'text/plain',
          video: null,
        },
      },
      'asset-1',
      'root-asset',
    );
    const assetPayload = message.asset as {threadId?: string; thread_id?: string};

    expect(message.content).toBe(GenericMessageType.ASSET);
    expect(assetPayload.threadId ?? assetPayload.thread_id).toBe('root-asset');
  });

  it('keeps non-thread messages without thread metadata', () => {
    const message = buildTextMessage({text: 'plain'}, 'plain-1');

    expect((message.text as {threadId?: string}).threadId).toBeUndefined();
  });

  it('fails fast with a typed error when thread context is attached to unsupported payload', () => {
    const pingMessage = buildPingMessage({hotKnock: false});

    expect(() => attachThreadIdToMessage(pingMessage, 'root-ping')).toThrow(UnsupportedThreadPayloadError);
  });
});
