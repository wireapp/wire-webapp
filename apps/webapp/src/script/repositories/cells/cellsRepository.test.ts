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

import type {RestPerformActionResponse} from 'cells-sdk-ts';

import type {APIClient} from '../../service/apiClientSingleton';

import {CellsRepository} from './cellsRepository';

type UploadCall = {
  readonly abortController: AbortController;
  readonly resolve: () => void;
  readonly reject: (error: unknown) => void;
};
type CellsRepositoryTestSetup = {repository: CellsRepository; calls: UploadCall[]};
type UploadedNodeVersion = {uuid: string; versionId: string};

const createRepository = (): CellsRepositoryTestSetup => {
  const calls: UploadCall[] = [];
  const apiClient = {
    api: {
      cells: {
        uploadNodeDraft: jest.fn(({abortController}: UploadCall) => {
          return new Promise<void>((resolve, reject) => {
            calls.push({abortController, resolve, reject});
          });
        }),
      },
    },
  };

  return {repository: new CellsRepository(apiClient as unknown as APIClient), calls};
};

const upload = (
  repository: CellsRepository,
  options?: {uuid?: string; abortController?: AbortController},
): Promise<UploadedNodeVersion> => {
  return repository.uploadNodeDraft({
    uuid: options?.uuid ?? 'upload-id',
    file: new File(['content'], 'document.txt', {type: 'text/plain'}),
    path: 'conversation-path',
    versionId: 'version-id',
    abortController: options?.abortController,
  });
};

describe('CellsRepository upload cancellation', () => {
  it('cancels legacy uploads through cancelUpload', async () => {
    const {repository, calls} = createRepository();
    const uploadTask = upload(repository);

    await Promise.resolve();
    repository.cancelUpload('upload-id');

    expect(calls[0].abortController.signal.aborted).toBe(true);
    calls[0].resolve();
    await uploadTask;
  });

  it('does not register a manager-owned controller in the legacy cancellation map', async () => {
    const {repository, calls} = createRepository();
    const controller = new AbortController();
    const uploadTask = upload(repository, {abortController: controller});

    await Promise.resolve();
    repository.cancelUpload('upload-id');

    expect(calls[0].abortController).toBe(controller);
    expect(controller.signal.aborted).toBe(false);
    controller.abort();
    calls[0].resolve();
    await uploadTask;
  });

  it('keeps the newest legacy controller when overlapping uploads share an ID', async () => {
    const {repository, calls} = createRepository();
    const firstUpload = upload(repository, {uuid: 'shared-id'});
    const secondUpload = upload(repository, {uuid: 'shared-id'});

    await Promise.resolve();
    calls[0].resolve();
    await firstUpload;
    repository.cancelUpload('shared-id');

    expect(calls[0].abortController.signal.aborted).toBe(false);
    expect(calls[1].abortController.signal.aborted).toBe(true);
    calls[1].resolve();
    await secondUpload;
  });
});

describe('CellsRepository bulk Bin actions', () => {
  it('waits for the batch delete response and returns every background job', async () => {
    const completions: Array<(response: RestPerformActionResponse) => void> = [];
    const request = new Promise<RestPerformActionResponse>(resolve => {
      completions.push(resolve);
    });
    const deleteNodes = jest.fn().mockReturnValue(request);
    const apiClient = {api: {cells: {deleteNodes}}};
    const repository = new CellsRepository(apiClient as never);
    const response: RestPerformActionResponse = {
      Status: 'Background',
      BackgroundActions: [
        {Name: 'delete', JobUuid: 'first-job'},
        {Name: 'delete', JobUuid: 'second-job'},
      ],
    };
    const resolved = jest.fn();

    const deletion = repository.deleteNodes({uuids: ['file-uuid', 'folder-uuid'], permanently: true});
    void deletion.then(resolved);
    await Promise.resolve();

    expect(deleteNodes).toHaveBeenCalledTimes(1);
    expect(deleteNodes).toHaveBeenCalledWith({uuids: ['file-uuid', 'folder-uuid'], permanently: true});
    expect(resolved).not.toHaveBeenCalled();

    completions[0](response);
    await expect(deletion).resolves.toBe(response);
  });

  it('defaults batch deletion to recycling', async () => {
    const response = {Status: 'Performed'};
    const deleteNodes = jest.fn().mockResolvedValue(response);
    const repository = new CellsRepository({api: {cells: {deleteNodes}}} as never);

    await expect(repository.deleteNodes({uuids: ['file-uuid']})).resolves.toBe(response);

    expect(deleteNodes).toHaveBeenCalledWith({uuids: ['file-uuid'], permanently: false});
  });

  it('propagates batch deletion failures to callers awaiting attachment deletion', async () => {
    const error = new Error('Delete failed');
    const deleteNodes = jest.fn().mockRejectedValue(error);
    const repository = new CellsRepository({api: {cells: {deleteNodes}}} as never);

    await expect(repository.deleteNodes({uuids: ['attachment-uuid'], permanently: true})).rejects.toBe(error);

    expect(deleteNodes).toHaveBeenCalledTimes(1);
  });

  it('forwards restore UUIDs in one request and preserves the response', async () => {
    const response = {Status: 'Background', BackgroundActions: [{Name: 'restore', JobUuid: 'restore-job'}]};
    const restoreNodes = jest.fn().mockResolvedValue(response);
    const repository = new CellsRepository({api: {cells: {restoreNodes}}} as never);

    await expect(repository.restoreNodes({uuids: ['file-uuid', 'folder-uuid']})).resolves.toBe(response);

    expect(restoreNodes).toHaveBeenCalledTimes(1);
    expect(restoreNodes).toHaveBeenCalledWith({uuids: ['file-uuid', 'folder-uuid']});
  });

  it('propagates batch restore failures', async () => {
    const error = new Error('Restore failed');
    const restoreNodes = jest.fn().mockRejectedValue(error);
    const repository = new CellsRepository({api: {cells: {restoreNodes}}} as never);

    await expect(repository.restoreNodes({uuids: ['file-uuid']})).rejects.toBe(error);
  });

  it.each(['delete', 'restore'] as const)('retrieves status for a background %s job', async name => {
    const response = {Name: name, JobUuid: 'action-job', Status: 'Running'};
    const getBackgroundActionInfo = jest.fn().mockResolvedValue(response);
    const repository = new CellsRepository({api: {cells: {getBackgroundActionInfo}}} as never);

    await expect(repository.getBackgroundActionInfo({name, jobUuid: 'action-job'})).resolves.toBe(response);

    expect(getBackgroundActionInfo).toHaveBeenCalledWith({name, jobUuid: 'action-job'});
  });
});

describe('CellsRepository bulk moves', () => {
  it('retrieves status for a background move job', async () => {
    const response = {JobUuid: 'move-job', Name: 'move', Status: 'Running'};
    const apiClient = {
      api: {
        cells: {
          getBackgroundActionInfo: jest.fn().mockResolvedValue(response),
        },
      },
    };
    const repository = new CellsRepository(apiClient as never);

    await expect(repository.getBackgroundMoveInfo({jobUuid: 'move-job'})).resolves.toBe(response);
    expect(apiClient.api.cells.getBackgroundActionInfo).toHaveBeenCalledWith({name: 'move', jobUuid: 'move-job'});
  });

  it('forwards all selected paths in one request and returns the Cells result', async () => {
    const response = {BackgroundActions: [{JobUuid: 'move-job', Name: 'move'}]};
    const apiClient = {
      api: {
        cells: {
          moveNodes: jest.fn().mockResolvedValue(response),
        },
      },
    };
    const repository = new CellsRepository(apiClient as never);
    const move = {currentPaths: ['Drive/file.txt', 'Drive/Folder'], targetPath: 'conversation-id@example.com/Archive'};

    await expect(repository.moveNodes(move)).resolves.toBe(response);
    expect(apiClient.api.cells.moveNodes).toHaveBeenCalledTimes(1);
    expect(apiClient.api.cells.moveNodes).toHaveBeenCalledWith(move);
  });
});

describe('CellsRepository upload paths', () => {
  const uploadPath = 'conversation-id@example.com/direct-upload';

  type CellsRepositoryUploadApiClient = {
    api: {
      cells: {
        uploadNode: jest.Mock;
        uploadNodeDraft: jest.Mock;
      };
    };
  };

  const createApiClient = (): CellsRepositoryUploadApiClient => {
    return {
      api: {
        cells: {
          uploadNode: jest.fn().mockResolvedValue(undefined),
          uploadNodeDraft: jest.fn().mockResolvedValue(undefined),
        },
      },
    };
  };

  it('directly uploads shared drive files at the selected conversation path', async () => {
    const apiClient = createApiClient();
    const repository = new CellsRepository(apiClient as never);
    const file = new File(['content'], 'document.txt');

    await repository.uploadNode({uuid: 'upload-uuid', file, path: 'conversation-id@example.com/direct-upload'});

    expect(apiClient.api.cells.uploadNode).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'conversation-id@example.com/direct-upload/document.txt',
      }),
    );
  });

  it('preserves relative paths for folder uploads', async () => {
    const apiClient = createApiClient();
    const repository = new CellsRepository(apiClient as never);
    const firstFile = new File(['first'], 'first.txt');
    const secondFile = new File(['second'], 'second.txt');

    Object.defineProperty(firstFile, 'webkitRelativePath', {value: 'Reports/first.txt'});
    Object.defineProperty(secondFile, 'webkitRelativePath', {value: 'Reports/Archive/second.txt'});

    await repository.uploadNode({uuid: 'upload-uuid', file: firstFile, path: uploadPath});
    await repository.uploadNode({uuid: 'upload-uuid-2', file: secondFile, path: uploadPath});

    expect(apiClient.api.cells.uploadNode).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({path: `${uploadPath}/Reports/first.txt`}),
    );
    expect(apiClient.api.cells.uploadNode).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({path: `${uploadPath}/Reports/Archive/second.txt`}),
    );
  });

  it('falls back to the cells storage root for direct uploads without a selected path', async () => {
    const apiClient = createApiClient();
    const repository = new CellsRepository(apiClient as never);
    const file = new File(['content'], 'document.txt');

    await repository.uploadNode({uuid: 'upload-uuid', file, path: ''});

    expect(apiClient.api.cells.uploadNode).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'wire-cells-web/document.txt',
      }),
    );
  });

  it('uploads file picker files at the selected cells path', async () => {
    const apiClient = createApiClient();
    const repository = new CellsRepository(apiClient as never);
    const file = new File(['content'], 'document.txt');

    await repository.uploadNodeDraft({uuid: 'upload-uuid', file, path: 'shared-drive'});

    expect(apiClient.api.cells.uploadNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'shared-drive/document.txt',
      }),
    );
  });

  it('preserves the selected folder structure for multiple folder picker files', async () => {
    const apiClient = createApiClient();
    const repository = new CellsRepository(apiClient as never);
    const firstFile = new File(['content'], 'brief.txt');
    const secondFile = new File(['content'], 'logo.png');
    Object.defineProperty(firstFile, 'webkitRelativePath', {value: 'Marketing/Briefs/brief.txt'});
    Object.defineProperty(secondFile, 'webkitRelativePath', {value: 'Marketing/Assets/logo.png'});

    await Promise.all([
      repository.uploadNodeDraft({uuid: 'first-upload-uuid', file: firstFile, path: 'shared-drive'}),
      repository.uploadNodeDraft({uuid: 'second-upload-uuid', file: secondFile, path: 'shared-drive'}),
    ]);

    expect(apiClient.api.cells.uploadNodeDraft).toHaveBeenCalledTimes(2);
    expect(apiClient.api.cells.uploadNodeDraft).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: 'shared-drive/Marketing/Briefs/brief.txt',
      }),
    );
    expect(apiClient.api.cells.uploadNodeDraft).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        path: 'shared-drive/Marketing/Assets/logo.png',
      }),
    );
  });

  it('preserves the selected folder structure for folder picker files', async () => {
    const apiClient = createApiClient();
    const repository = new CellsRepository(apiClient as never);
    const file = new File(['content'], 'document.txt');
    Object.defineProperty(file, 'webkitRelativePath', {value: 'Marketing/Briefs/document.txt'});

    await repository.uploadNodeDraft({uuid: 'upload-uuid', file, path: 'shared-drive'});

    expect(apiClient.api.cells.uploadNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'shared-drive/Marketing/Briefs/document.txt',
      }),
    );
  });
});
