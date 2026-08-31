import {act, renderHook, waitFor} from '@testing-library/react';

import {useFileUploadState} from '../useFilesUploadState/useFilesUploadState';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {useFilesUploadDropzone} from './useFilesUploadDropzone';

const conversation = {id: 'conversation-id', qualifiedId: {id: 'conversation-id', domain: 'example.com'}};
const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

const createRepository = () => ({
  uploadNodeDraft: jest.fn(),
  cancelUpload: jest.fn(),
  deleteNodeDraft: jest.fn(),
});

describe('useFilesUploadDropzone', () => {
  beforeEach(() => {
    useFileUploadState.getState().clearAll({conversationId: conversation.id});
    URL.createObjectURL = jest.fn(() => 'blob:preview');
  });

  it('adds a local preview before starting an upload and maps repository progress to percent', async () => {
    let resolveUpload: (result: {uuid: string; versionId: string}) => void = () => undefined;
    const uploadPromise = new Promise<{uuid: string; versionId: string}>(resolve => {
      resolveUpload = resolve;
    });
    const cellsRepository = createRepository();
    cellsRepository.uploadNodeDraft.mockImplementation(async ({progressCallback}: {progressCallback: (value: number) => void}) => {
      progressCallback(0.25);
      return uploadPromise;
    });
    const {result} = renderHook(
      () =>
        useFilesUploadDropzone({
          isTeam: false,
          isCellsEnabled: true,
          isDisabled: false,
          isFileDropAllowed: true,
          cellsRepository: cellsRepository as never,
          translate: translateForTest,
          conversation,
        }),
      {wrapper},
    );
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});

    let upload!: Promise<void>;
    await act(async () => {
      upload = result.current.handlePastedFile(file);
    });
    await waitFor(() => expect(useFileUploadState.getState().getFiles({conversationId: conversation.id})).toHaveLength(1));

    expect(cellsRepository.uploadNodeDraft).toHaveBeenCalledTimes(1);
    expect(useFileUploadState.getState().getFiles({conversationId: conversation.id})[0]).toMatchObject({
      name: 'document.txt',
      preview: 'blob:preview',
      uploadProgress: 25,
      uploadStatus: 'uploading',
    });

    resolveUpload({uuid: 'remote-id', versionId: 'version-id'});
    await act(async () => await upload);
    expect(useFileUploadState.getState().getFiles({conversationId: conversation.id})[0]).toMatchObject({
      remoteUuid: 'remote-id',
      remoteVersionId: 'version-id',
      uploadStatus: 'success',
    });
  });

  it('marks an upload as retryable when the repository rejects', async () => {
    const cellsRepository = createRepository();
    cellsRepository.uploadNodeDraft.mockRejectedValue(new Error('network'));
    const {result} = renderHook(
      () =>
        useFilesUploadDropzone({
          isTeam: false,
          isCellsEnabled: true,
          isDisabled: false,
          isFileDropAllowed: true,
          cellsRepository: cellsRepository as never,
          translate: translateForTest,
          conversation,
        }),
      {wrapper},
    );

    let uploadError: unknown;
    await act(async () => {
      try {
        await result.current.handlePastedFile(new File(['content'], 'document.txt'));
      } catch (error: unknown) {
        uploadError = error;
      }
    });
    expect(uploadError).toEqual(new Error('network'));
    expect(useFileUploadState.getState().getFiles({conversationId: conversation.id})[0].uploadStatus).toBe('error');
  });

  it('does not mark an aborted upload as an error', async () => {
    const cellsRepository = createRepository();
    const abortError = Object.assign(new Error('cancelled'), {name: 'AbortError'});
    cellsRepository.uploadNodeDraft.mockRejectedValue(abortError);
    const {result} = renderHook(
      () =>
        useFilesUploadDropzone({
          isTeam: false,
          isCellsEnabled: true,
          isDisabled: false,
          isFileDropAllowed: true,
          cellsRepository: cellsRepository as never,
          translate: translateForTest,
          conversation,
        }),
      {wrapper},
    );

    await act(async () => result.current.handlePastedFile(new File(['content'], 'document.txt')));
    expect(useFileUploadState.getState().getFiles({conversationId: conversation.id})[0].uploadStatus).toBe('uploading');
  });
});
