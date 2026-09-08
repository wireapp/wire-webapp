import {act, renderHook} from '@testing-library/react';

import {FileWithPreview, useFileUploadState} from 'Components/conversation/useFilesUploadState/useFilesUploadState';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {useFilePreview} from './useFilePreview';

const conversationId = 'local-conversation-id';
const conversation = {id: 'qualified-conversation-id', domain: 'example.com'};
const fireAndForgetInvoker = {
  fireAndForget: jest.fn((action: () => Promise<void>) => void action()),
  waitUntilAllSettled: jest.fn(async () => undefined),
};
const wrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest, fireAndForgetInvoker}),
);

const createFile = (overrides: Partial<FileWithPreview> = {}): FileWithPreview =>
  Object.assign(new File(['content'], 'document.txt', {type: 'text/plain'}), {
    id: 'local-id',
    preview: 'blob:local-id',
    remoteUuid: 'remote-id',
    remoteVersionId: 'old-version-id',
    uploadStatus: 'success' as const,
    uploadProgress: 100,
    ...overrides,
  });

describe('useFilePreview', () => {
  const originalNodeEnvironment = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    useFileUploadState.getState().clearAll({conversationId});
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnvironment;
  });

  it('exposes display metadata and marks failed uploads', () => {
    const {result} = renderHook(
      () =>
        useFilePreview({
          file: createFile({uploadStatus: 'error'}),
          cellsRepository: {} as never,
          conversationId,
          conversationQualifiedId: conversation,
        }),
      {wrapper},
    );

    expect(result.current).toMatchObject({name: 'Upload failed: document', extension: 'txt', isError: true});
  });

  it('cancels loading uploads, revokes the preview, and removes the local preview without deleting a draft', () => {
    const cellsRepository = {cancelUpload: jest.fn(), deleteNodeDraft: jest.fn()};
    const file = createFile({uploadStatus: 'uploading'});
    useFileUploadState.getState().addFiles({conversationId, files: [file]});
    const {result} = renderHook(
      () =>
        useFilePreview({
          file,
          cellsRepository: cellsRepository as never,
          conversationId,
          conversationQualifiedId: conversation,
        }),
      {wrapper},
    );

    act(() => result.current.handleDelete());

    expect(cellsRepository.cancelUpload).toHaveBeenCalledWith('local-id');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-id');
    expect(cellsRepository.deleteNodeDraft).not.toHaveBeenCalled();
    expect(useFileUploadState.getState().getFiles({conversationId})).toEqual([]);
  });

  it('revokes the preview and discards a completed remote draft', async () => {
    const cellsRepository = {cancelUpload: jest.fn(), deleteNodeDraft: jest.fn().mockResolvedValue(undefined)};
    const file = createFile();
    useFileUploadState.getState().addFiles({conversationId, files: [file]});
    const {result} = renderHook(
      () =>
        useFilePreview({
          file,
          cellsRepository: cellsRepository as never,
          conversationId,
          conversationQualifiedId: conversation,
        }),
      {wrapper},
    );

    act(() => result.current.handleDelete());
    await act(async () => await fireAndForgetInvoker.waitUntilAllSettled());

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-id');
    expect(cellsRepository.deleteNodeDraft).toHaveBeenCalledWith({uuid: 'remote-id', versionId: 'old-version-id'});
    expect(useFileUploadState.getState().getFiles({conversationId})).toEqual([]);
  });

  it('retries a failed upload with its local resource ID and stores its new version', async () => {
    const cellsRepository = {
      uploadNodeDraft: jest.fn().mockResolvedValue({uuid: 'remote-id', versionId: 'new-version-id'}),
    };
    const file = createFile({uploadStatus: 'error', remoteUuid: 'remote-id', remoteVersionId: 'old-version-id'});
    useFileUploadState.getState().addFiles({conversationId, files: [file]});
    const {result} = renderHook(
      () =>
        useFilePreview({
          file,
          cellsRepository: cellsRepository as never,
          conversationId,
          conversationQualifiedId: conversation,
        }),
      {wrapper},
    );

    await act(async () => result.current.handleRetry());

    expect(cellsRepository.uploadNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({uuid: 'local-id', file, path: 'qualified-conversation-id@example.com'}),
    );
    expect(useFileUploadState.getState().getFiles({conversationId})[0]).toMatchObject({
      remoteUuid: 'remote-id',
      remoteVersionId: 'new-version-id',
      uploadStatus: 'success',
    });
  });

  it('uses the local conversation ID for development retries', async () => {
    process.env.NODE_ENV = 'development';
    const cellsRepository = {
      uploadNodeDraft: jest.fn().mockResolvedValue({uuid: 'remote-id', versionId: 'new-version-id'}),
    };
    const file = createFile({uploadStatus: 'error'});
    useFileUploadState.getState().addFiles({conversationId, files: [file]});
    const {result} = renderHook(
      () =>
        useFilePreview({
          file,
          cellsRepository: cellsRepository as never,
          conversationId,
          conversationQualifiedId: conversation,
        }),
      {wrapper},
    );

    await act(async () => result.current.handleRetry());

    expect(cellsRepository.uploadNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({path: expect.stringMatching(/^local-conversation-id@/)}),
    );
  });

  it('keeps a failed state when retry fails', async () => {
    const cellsRepository = {uploadNodeDraft: jest.fn().mockRejectedValue(new Error('network'))};
    const file = createFile({uploadStatus: 'error'});
    useFileUploadState.getState().addFiles({conversationId, files: [file]});
    const {result} = renderHook(
      () =>
        useFilePreview({
          file,
          cellsRepository: cellsRepository as never,
          conversationId,
          conversationQualifiedId: conversation,
        }),
      {wrapper},
    );

    await act(async () => result.current.handleRetry());

    expect(useFileUploadState.getState().getFiles({conversationId})[0].uploadStatus).toBe('error');
  });
});
