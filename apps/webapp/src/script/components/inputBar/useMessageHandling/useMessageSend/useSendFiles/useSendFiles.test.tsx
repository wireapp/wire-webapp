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

import type {FileWithPreview} from 'Components/conversation/useFilesUploadState/useFilesUploadState';

import {useSendFiles} from './useSendFiles';

type Repository = {
  promoteNodeDraft: jest.Mock<Promise<void>, [{uuid: string; versionId: string}]>;
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {promise, resolve, reject};
};

const createFile = (id: string, preview = `blob:${id}`): FileWithPreview =>
  Object.assign(new File(['content'], `${id}.png`, {type: 'image/png'}), {
    id,
    preview,
    remoteUuid: `remote-${id}`,
    remoteVersionId: `version-${id}`,
    uploadStatus: 'success' as const,
    uploadProgress: 100,
  });

describe('useSendFiles', () => {
  it('promotes every draft before completing and revokes previews', async () => {
    const repository: Repository = {promoteNodeDraft: jest.fn().mockResolvedValue(undefined)};
    const revoke = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    revoke.mockClear();
    const {result} = renderHook(() =>
      useSendFiles({
        files: [createFile('one'), createFile('two')],
        cellsRepository: repository as never,
        clearAllFiles: jest.fn(),
        conversationId: 'conversation',
        sendFilesErrorMessage: 'send failed',
      }),
    );

    await act(async () => result.current.sendFiles());

    expect(repository.promoteNodeDraft).toHaveBeenNthCalledWith(1, {uuid: 'remote-one', versionId: 'version-one'});
    expect(repository.promoteNodeDraft).toHaveBeenNthCalledWith(2, {uuid: 'remote-two', versionId: 'version-two'});
    expect(revoke).toHaveBeenCalledWith('blob:one');
    expect(revoke).toHaveBeenCalledWith('blob:two');
    revoke.mockRestore();
  });

  it('starts all publications before completing when one finishes later', async () => {
    const firstPublication = createDeferred<void>();
    const secondPublication = createDeferred<void>();
    const repository: Repository = {
      promoteNodeDraft: jest
        .fn()
        .mockReturnValueOnce(firstPublication.promise)
        .mockReturnValueOnce(secondPublication.promise),
    };
    const files = [createFile('one'), createFile('two')];
    const {result} = renderHook(() =>
      useSendFiles({
        files,
        cellsRepository: repository as never,
        clearAllFiles: jest.fn(),
        conversationId: 'conversation',
        sendFilesErrorMessage: 'send failed',
      }),
    );

    let sending: Promise<void> | undefined;
    await act(async () => {
      sending = result.current.sendFiles();
      await Promise.resolve();
    });

    expect(repository.promoteNodeDraft).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(true);
    secondPublication.resolve();
    firstPublication.resolve();
    await act(async () => sending);
    expect(result.current.isLoading).toBe(false);
  });

  it('does not revoke previews or cancel a promoted draft after another publication fails', async () => {
    const firstPublication = createDeferred<void>();
    const secondPublication = createDeferred<void>();
    const cancelUpload = jest.fn();
    const repository: Repository & {cancelUpload: jest.Mock} = {
      promoteNodeDraft: jest
        .fn()
        .mockReturnValueOnce(firstPublication.promise)
        .mockReturnValueOnce(secondPublication.promise),
      cancelUpload,
    };
    const files = [createFile('one'), createFile('two')];
    const revoke = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    revoke.mockClear();
    const {result} = renderHook(() =>
      useSendFiles({
        files,
        cellsRepository: repository as never,
        clearAllFiles: jest.fn(),
        conversationId: 'conversation',
        sendFilesErrorMessage: 'send failed',
      }),
    );

    let sending: Promise<void> | undefined;
    await act(async () => {
      sending = result.current.sendFiles();
      await Promise.resolve();
    });
    expect(repository.promoteNodeDraft).toHaveBeenCalledTimes(2);

    firstPublication.resolve();
    secondPublication.reject(new Error('second publication failed'));
    await expect(act(async () => sending)).rejects.toThrow();

    expect(revoke).not.toHaveBeenCalled();
    expect(cancelUpload).not.toHaveBeenCalled();
    revoke.mockRestore();
  });
});
