/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {act, renderHook} from '@testing-library/react';

import {FileWithPreview, useFileUploadState} from 'Components/conversation/useFilesUploadState/useFilesUploadState';
import {Config} from 'src/script/Config';

import {useMessageSend} from './useMessageSend';

const conversationId = 'conversation';

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {promise, resolve, reject};
};

const createFile = (
  id: string,
  uploadStatus: 'success' | 'uploading' = 'success',
  media: Pick<FileWithPreview, 'audio' | 'video'> = {},
): FileWithPreview =>
  Object.assign(new File(['content'], `${id}.png`, {type: 'image/png'}), {
    id,
    preview: `blob:${id}`,
    remoteUuid: `remote-${id}`,
    remoteVersionId: `version-${id}`,
    uploadStatus,
    uploadProgress: uploadStatus === 'success' ? 100 : 40,
    image: {width: 10, height: 20},
    ...media,
  });

const createProps = (overrides: Record<string, unknown> = {}) => ({
  replyMessageEntity: null,
  eventRepository: {eventService: {loadEvent: jest.fn()}} as never,
  messageRepository: {sendTextWithLinkPreview: jest.fn()} as never,
  conversation: {id: conversationId, mlsVerificationState: () => 'unverified'} as never,
  conversationRepository: {refreshMLSConversationVerificationState: jest.fn()} as never,
  cellsRepository: {promoteNodeDraft: jest.fn().mockResolvedValue(undefined)} as never,
  draftState: {reset: jest.fn()},
  cancelMessageEditing: jest.fn(),
  cancelMessageReply: jest.fn(),
  editedMessage: undefined,
  replyMessageCallback: jest.fn(),
  editorRef: {current: null},
  pastedFile: null,
  sendPastedFile: jest.fn(),
  messageContent: {text: 'hello', mentions: []},
  translate: ((key: string) => key) as never,
  ...overrides,
});

describe('useMessageSend', () => {
  let configSpy: jest.SpyInstance;
  let notificationContainer: HTMLDivElement;

  beforeEach(() => {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'app-notification';
    document.body.appendChild(notificationContainer);
    useFileUploadState.getState().clearAll({conversationId});
    configSpy = jest.spyOn(Config, 'getConfig').mockReturnValue({
      FEATURE: {ENABLE_CELLS: true},
      MAXIMUM_MESSAGE_LENGTH: 1000,
    } as never);
  });

  afterEach(() => {
    configSpy.mockRestore();
    notificationContainer.remove();
  });

  it('keeps sending disabled until every selected file is ready', () => {
    useFileUploadState
      .getState()
      .addFiles({conversationId, files: [createFile('ready'), createFile('loading', 'uploading')]});

    const {result} = renderHook(() => useMessageSend(createProps()));

    expect(result.current.isSendingDisabled).toBe(true);
  });

  it('publishes every ready draft before sending text with preserved attachment metadata', async () => {
    const sendTextWithLinkPreview = jest.fn();
    const publication = createDeferred<void>();
    const promoteNodeDraft = jest.fn().mockReturnValue(publication.promise);
    const files = [createFile('image')];
    useFileUploadState.getState().addFiles({conversationId, files});
    const props = createProps({
      cellsRepository: {promoteNodeDraft} as never,
      messageRepository: {sendTextWithLinkPreview} as never,
    });
    const {result} = renderHook(() => useMessageSend(props));

    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage();
    });
    await act(async () => Promise.resolve());

    expect(promoteNodeDraft).toHaveBeenCalledWith({uuid: 'remote-image', versionId: 'version-image'});
    expect(sendTextWithLinkPreview).not.toHaveBeenCalled();
    publication.resolve();
    await act(async () => sendPromise!);
    await act(async () => Promise.resolve());

    expect(sendTextWithLinkPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        textMessage: 'hello',
        attachments: [
          {
            cellAsset: {
              uuid: 'image',
              contentType: 'image/png',
              initialName: 'image.png',
              initialSize: files[0].size,
              image: {width: 10, height: 20},
              audio: undefined,
              video: undefined,
            },
          },
        ],
      }),
    );
    expect(useFileUploadState.getState().getFiles({conversationId})).toEqual([]);
  });

  it('returns publication failures without sending or clearing retryable files', async () => {
    const sendTextWithLinkPreview = jest.fn();
    const promoteNodeDraft = jest.fn().mockRejectedValue(new Error('publication failed'));
    const file = createFile('failed');
    useFileUploadState.getState().addFiles({conversationId, files: [file]});
    const {result} = renderHook(() =>
      useMessageSend(
        createProps({
          cellsRepository: {promoteNodeDraft} as never,
          messageRepository: {sendTextWithLinkPreview} as never,
        }),
      ),
    );

    await act(async () => {
      await expect(result.current.sendMessage()).rejects.toThrow('publication failed');
    });

    expect(promoteNodeDraft).toHaveBeenCalledWith({uuid: 'remote-failed', versionId: 'version-failed'});
    expect(sendTextWithLinkPreview).not.toHaveBeenCalled();
    expect(useFileUploadState.getState().getFiles({conversationId})).toEqual([file]);
  });

  it('preserves image, audio, and video attachment metadata', async () => {
    const sendTextWithLinkPreview = jest.fn();
    const file = createFile('media', 'success', {
      audio: {durationInMillis: 3},
      video: {width: 1920, height: 1080},
    });
    useFileUploadState.getState().addFiles({conversationId, files: [file]});
    const {result} = renderHook(() =>
      useMessageSend(createProps({messageRepository: {sendTextWithLinkPreview} as never})),
    );

    await act(async () => result.current.sendMessage());
    await act(async () => Promise.resolve());

    expect(sendTextWithLinkPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            cellAsset: expect.objectContaining({
              image: {width: 10, height: 20},
              audio: {durationInMillis: 3},
              video: {width: 1920, height: 1080},
            }),
          }),
        ],
      }),
    );
  });

  it('sends text without attachments when no files are selected', async () => {
    const sendTextWithLinkPreview = jest.fn();
    const {result} = renderHook(() =>
      useMessageSend(createProps({messageRepository: {sendTextWithLinkPreview} as never})),
    );

    await act(async () => result.current.sendMessage());
    await act(async () => Promise.resolve());

    expect(sendTextWithLinkPreview).toHaveBeenCalledWith(
      expect.objectContaining({textMessage: 'hello', attachments: []}),
    );
  });
});
