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

import type {APIClient} from '../../service/apiClientSingleton';

import {CellsRepository} from './cellsRepository';

type UploadCall = {
  readonly abortController: AbortController;
  readonly resolve: () => void;
  readonly reject: (error: unknown) => void;
};

const createRepository = () => {
  const calls: UploadCall[] = [];
  const apiClient = {
    api: {
      cells: {
        uploadNodeDraft: jest.fn(
          ({abortController}: UploadCall) =>
            new Promise<void>((resolve, reject) => {
              calls.push({abortController, resolve, reject});
            }),
        ),
      },
    },
  };

  return {repository: new CellsRepository(apiClient as unknown as APIClient), calls};
};

const upload = (repository: CellsRepository, options?: {uuid?: string; abortController?: AbortController}) =>
  repository.uploadNodeDraft({
    uuid: options?.uuid ?? 'upload-id',
    file: new File(['content'], 'document.txt', {type: 'text/plain'}),
    path: 'conversation-path',
    versionId: 'version-id',
    abortController: options?.abortController,
  });

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

describe('CellsRepository upload paths', () => {
  const createApiClient = () => ({
    api: {
      cells: {
        uploadNodeDraft: jest.fn().mockResolvedValue(undefined),
      },
    },
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
