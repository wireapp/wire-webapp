/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {AxiosResponse} from 'axios';
import {
  NodeServiceApi,
  RestNode,
  RestNodeCollection,
  RestPublicLinkDeleteSuccess,
  RestShareLink,
  RestVersion,
  RestPerformActionResponse,
} from 'cells-sdk-ts';
import {v4 as uuidv4} from 'uuid';

import {CellsAPI} from './CellsAPI';
import {CellsStorage} from './CellsStorage/CellsStorage';
import {S3Service} from './CellsStorage/S3Service';

import {AccessTokenStore} from '../auth/AccessTokenStore';
import {HttpClient} from '../http';
import {cellsConfigMock} from '../mocks/cells';

jest.mock('cells-sdk-ts');
jest.mock('uuid');
jest.mock('./CellsStorage/S3Service');

describe('CellsAPI', () => {
  let cellsAPI: CellsAPI;
  let mockHttpClient: jest.Mocked<HttpClient>;
  let mockStorage: jest.Mocked<CellsStorage>;
  let mockNodeServiceApi: jest.Mocked<NodeServiceApi>;
  let testFile: File;

  beforeEach(() => {
    jest.clearAllMocks();

    (uuidv4 as jest.Mock).mockReturnValue(MOCKED_UUID);

    mockHttpClient = {
      config: {
        cells: cellsConfigMock,
      },
      client: {},
    } as unknown as jest.Mocked<HttpClient>;

    mockStorage = {
      putObject: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CellsStorage>;

    mockNodeServiceApi = {
      createCheck: jest.fn(),
      getByUuid: jest.fn(),
      lookup: jest.fn(),
      performAction: jest.fn(),
      create: jest.fn(),
      promoteVersion: jest.fn(),
      deleteVersion: jest.fn(),
      deletePublicLink: jest.fn(),
      createPublicLink: jest.fn(),
      nodeVersions: jest.fn(),
      getPublicLink: jest.fn(),
      updatePublicLink: jest.fn(),
      listNamespaceValues: jest.fn(),
      patchNode: jest.fn(),
    } as unknown as jest.Mocked<NodeServiceApi>;

    (NodeServiceApi as jest.Mock).mockImplementation(() => mockNodeServiceApi);

    testFile = new File([TEST_FILE_CONTENT], TEST_FILE_NAME, {type: TEST_FILE_TYPE}) as File;

    cellsAPI = new CellsAPI({
      accessTokenStore: {} as AccessTokenStore,
      httpClientConfig: {
        urls: {
          rest: cellsConfigMock.pydio.url + cellsConfigMock.pydio.segment,
          name: 'cells',
          ws: 'wss://cells.wire.com',
        },
        headers: {Authorization: `Bearer ${cellsConfigMock.pydio.apiKey}`},
      },
    });
    cellsAPI.initialize({cellsConfig: cellsConfigMock, httpClient: mockHttpClient, storageService: mockStorage});
  });

  it('initializes with provided config and creates NodeServiceApi', () => {
    expect(NodeServiceApi).toHaveBeenCalledWith(undefined, undefined, expect.any(Object));
  });

  it('creates a default S3Service if none is provided', () => {
    (S3Service as jest.Mock).mockClear();

    const api = new CellsAPI({
      accessTokenStore: {} as AccessTokenStore,
      httpClientConfig: {
        urls: {
          rest: cellsConfigMock.pydio.url + cellsConfigMock.pydio.segment,
          name: 'cells',
          ws: 'wss://cells.wire.com',
        },
        headers: {Authorization: `Bearer ${cellsConfigMock.pydio.apiKey}`},
      },
    });
    api.initialize({cellsConfig: cellsConfigMock, httpClient: mockHttpClient});

    expect(S3Service).toHaveBeenCalledTimes(1);
    expect(S3Service).toHaveBeenCalledWith({config: cellsConfigMock.s3, accessTokenStore: {} as AccessTokenStore});
  });

  describe('uploadNodeDraft', () => {
    it('normalizes file paths and uploads with correct metadata', async () => {
      mockNodeServiceApi.createCheck.mockResolvedValueOnce(
        createMockResponse({
          Results: [
            {
              Exists: false,
            },
          ],
        }),
      );

      await cellsAPI.uploadNodeDraft({
        uuid: MOCKED_UUID,
        versionId: MOCKED_UUID,
        path: TEST_FILE_PATH,
        file: testFile,
      });

      expect(mockNodeServiceApi.createCheck).toHaveBeenCalledWith(
        {
          Inputs: [{Type: 'LEAF', Locator: {Path: TEST_FILE_PATH, Uuid: MOCKED_UUID}, VersionId: MOCKED_UUID}],
          FindAvailablePath: true,
        },
        {abortController: undefined},
      );

      expect(mockStorage.putObject).toHaveBeenCalledWith({
        path: TEST_FILE_PATH,
        file: testFile,
        metadata: {
          'Draft-Mode': 'true',
          'Create-Resource-Uuid': MOCKED_UUID,
          'Create-Version-Id': MOCKED_UUID,
        },
        abortController: undefined,
      });
    });

    it('uses auto-renaming when file exists and autoRename is true', async () => {
      const nextPath = `/folder/test (1).txt`;

      mockNodeServiceApi.createCheck.mockResolvedValueOnce(
        createMockResponse({
          Results: [
            {
              Exists: true,
              NextPath: nextPath,
            },
          ],
        }),
      );

      await cellsAPI.uploadNodeDraft({
        uuid: MOCKED_UUID,
        versionId: MOCKED_UUID,
        path: TEST_FILE_PATH,
        file: testFile,
      });

      expect(mockStorage.putObject).toHaveBeenCalledWith({
        path: nextPath,
        file: testFile,
        metadata: {
          'Draft-Mode': 'true',
          'Create-Resource-Uuid': MOCKED_UUID,
          'Create-Version-Id': MOCKED_UUID,
        },
      });
    });

    it('keeps original path when autoRename is false', async () => {
      const nextPath = `/folder/test (1).txt`;

      mockNodeServiceApi.createCheck.mockResolvedValueOnce(
        createMockResponse({
          Results: [
            {
              Exists: true,
              NextPath: nextPath,
            },
          ],
        }),
      );

      await cellsAPI.uploadNodeDraft({
        uuid: MOCKED_UUID,
        versionId: MOCKED_UUID,
        path: TEST_FILE_PATH,
        file: testFile,
        autoRename: false,
      });

      expect(mockStorage.putObject).toHaveBeenCalledWith({
        path: TEST_FILE_PATH,
        file: testFile,
        metadata: {
          'Draft-Mode': 'true',
          'Create-Resource-Uuid': MOCKED_UUID,
          'Create-Version-Id': MOCKED_UUID,
        },
      });
    });

    it('propagates errors from NodeServiceApi', async () => {
      const errorMessage = 'API error';
      mockNodeServiceApi.createCheck.mockRejectedValueOnce(new Error(errorMessage));

      await expect(
        cellsAPI.uploadNodeDraft({uuid: MOCKED_UUID, versionId: MOCKED_UUID, path: TEST_FILE_PATH, file: testFile}),
      ).rejects.toThrow(errorMessage);
    });

    it('propagates errors from StorageService', async () => {
      mockNodeServiceApi.createCheck.mockResolvedValueOnce(
        createMockResponse({
          Results: [
            {
              Exists: false,
            },
          ],
        }),
      );

      const errorMessage = 'Storage error';
      mockStorage.putObject.mockRejectedValueOnce(new Error(errorMessage));

      await expect(
        cellsAPI.uploadNodeDraft({uuid: MOCKED_UUID, versionId: MOCKED_UUID, path: TEST_FILE_PATH, file: testFile}),
      ).rejects.toThrow(errorMessage);
    });

    it('handles empty file path by using root path', async () => {
      mockNodeServiceApi.createCheck.mockResolvedValueOnce(
        createMockResponse({
          Results: [
            {
              Exists: false,
            },
          ],
        }),
      );

      await cellsAPI.uploadNodeDraft({uuid: MOCKED_UUID, versionId: MOCKED_UUID, path: '', file: testFile});

      expect(mockNodeServiceApi.createCheck).toHaveBeenCalledWith(
        {
          Inputs: [{Type: 'LEAF', Locator: {Path: '', Uuid: MOCKED_UUID}, VersionId: MOCKED_UUID}],
          FindAvailablePath: true,
        },
        {abortControllerntroller: undefined},
      );

      expect(mockStorage.putObject).toHaveBeenCalledWith({
        path: '',
        file: testFile,
        metadata: {
          'Draft-Mode': 'true',
          'Create-Resource-Uuid': MOCKED_UUID,
          'Create-Version-Id': MOCKED_UUID,
        },
        abortController: undefined,
      });
    });
  });

  describe('getNode', () => {
    it('retrieves a file by ID', async () => {
      const fileId = 'file-uuid';
      const mockNode: Partial<RestNode> = {
        Path: TEST_FILE_PATH,
        Uuid: fileId,
      };

      mockNodeServiceApi.getByUuid.mockResolvedValueOnce(createMockResponse(mockNode as RestNode));

      const result = await cellsAPI.getNode({id: fileId});

      expect(mockNodeServiceApi.getByUuid).toHaveBeenCalledWith(fileId, undefined);
      expect(result).toEqual(mockNode);
    });

    it('propagates errors when file retrieval fails', async () => {
      const fileId = 'file-uuid';
      const errorMessage = 'File not found';

      mockNodeServiceApi.getByUuid.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.getNode({id: fileId})).rejects.toThrow(errorMessage);
    });

    it('handles empty ID', async () => {
      const emptyId = '';

      await expect(cellsAPI.getNode({id: emptyId})).rejects.toThrow();
    });
  });

  describe('getAllNodes', () => {
    it('retrieves all files with the correct parameters', async () => {
      const mockCollection: Partial<RestNodeCollection> = {
        Nodes: [
          {Path: '/file1.txt', Uuid: 'uuid1'},
          {Path: '/file2.txt', Uuid: 'uuid2'},
        ],
      };

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockCollection as RestNodeCollection));

      const result = await cellsAPI.getAllNodes({path: TEST_FILE_PATH});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: TEST_FILE_PATH}},
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
        Filters: {
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
        },
      });
      expect(result).toEqual(mockCollection);
    });

    it('retrieves deleted files when deleted is true', async () => {
      const mockCollection: Partial<RestNodeCollection> = {
        Nodes: [
          {Path: '/deleted1.txt', Uuid: 'uuid1'},
          {Path: '/deleted2.txt', Uuid: 'uuid2'},
        ],
      };

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockCollection as RestNodeCollection));

      const result = await cellsAPI.getAllNodes({path: TEST_FILE_PATH, deleted: true});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: TEST_FILE_PATH}},
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
        Filters: {
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Only',
          },
        },
      });
      expect(result).toEqual(mockCollection);
    });

    it('uses default values when limit and offset are not provided', async () => {
      const mockCollection: Partial<RestNodeCollection> = {
        Nodes: [
          {Path: '/file1.txt', Uuid: 'uuid1'},
          {Path: '/file2.txt', Uuid: 'uuid2'},
        ],
      };

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockCollection as RestNodeCollection));

      const result = await cellsAPI.getAllNodes({path: TEST_FILE_PATH});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: TEST_FILE_PATH}},
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
        Filters: {
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
        },
      });
      expect(result).toEqual(mockCollection);
    });

    it('respects custom limit and offset parameters', async () => {
      const mockCollection: Partial<RestNodeCollection> = {
        Nodes: [
          {Path: '/file1.txt', Uuid: 'uuid1'},
          {Path: '/file2.txt', Uuid: 'uuid2'},
        ],
      };

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockCollection as RestNodeCollection));

      const result = await cellsAPI.getAllNodes({
        path: TEST_FILE_PATH,
        limit: 5,
        offset: 10,
      });

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: TEST_FILE_PATH}},
        Flags: ['WithPreSignedURLs'],
        Limit: '5',
        Offset: '10',
        Filters: {
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
        },
      });
      expect(result).toEqual(mockCollection);
    });

    it('respects custom sorting parameters', async () => {
      const mockCollection: Partial<RestNodeCollection> = {
        Nodes: [
          {Path: '/file1.txt', Uuid: 'uuid1'},
          {Path: '/file2.txt', Uuid: 'uuid2'},
        ],
      };

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockCollection as RestNodeCollection));

      const result = await cellsAPI.getAllNodes({
        path: TEST_FILE_PATH,
        sortBy: 'name',
        sortDirection: 'asc',
      });

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: TEST_FILE_PATH}},
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
        SortField: 'name',
        SortDirDesc: false,
        Filters: {
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
        },
      });
      expect(result).toEqual(mockCollection);
    });

    it('handles descending sort direction', async () => {
      const mockCollection: Partial<RestNodeCollection> = {
        Nodes: [
          {Path: '/file1.txt', Uuid: 'uuid1'},
          {Path: '/file2.txt', Uuid: 'uuid2'},
        ],
      };

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockCollection as RestNodeCollection));

      const result = await cellsAPI.getAllNodes({
        path: TEST_FILE_PATH,
        sortBy: 'size',
        sortDirection: 'desc',
      });

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: TEST_FILE_PATH}},
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
        SortField: 'size',
        SortDirDesc: true,
        Filters: {
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
        },
      });
      expect(result).toEqual(mockCollection);
    });

    it('filters by type when provided', async () => {
      const mockCollection: Partial<RestNodeCollection> = {
        Nodes: [{Path: '/file1.txt', Uuid: 'uuid1', Type: 'LEAF'}],
      };

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockCollection as RestNodeCollection));

      const result = await cellsAPI.getAllNodes({
        path: TEST_FILE_PATH,
        type: 'LEAF',
      });

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: TEST_FILE_PATH}},
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
        Filters: {
          Type: 'LEAF',
          Status: {
            Deleted: 'Not',
          },
        },
      });
      expect(result).toEqual(mockCollection);
    });

    it('propagates errors when lookup fails', async () => {
      const errorMessage = 'Lookup failed';

      mockNodeServiceApi.lookup.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.getAllNodes({path: TEST_FILE_PATH})).rejects.toThrow(errorMessage);
    });

    it('returns empty collection when no files exist', async () => {
      const emptyCollection: Partial<RestNodeCollection> = {
        Nodes: [],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(emptyCollection as RestNodeCollection));

      const result = await cellsAPI.getAllNodes({path: TEST_FILE_PATH});
      expect(result).toEqual(emptyCollection);
    });
  });

  describe('deleteNode', () => {
    it('deletes a file with the correct uuid', async () => {
      const uuid = 'file-uuid';

      mockNodeServiceApi.performAction.mockResolvedValueOnce(createMockResponse({}));

      await cellsAPI.deleteNode({uuid});

      expect(mockNodeServiceApi.performAction).toHaveBeenCalledWith('delete', {
        Nodes: [{Uuid: uuid}],
        DeleteOptions: {PermanentDelete: false},
      });
    });

    it('deletes a file permanently when permanently is true', async () => {
      const uuid = 'file-uuid';

      mockNodeServiceApi.performAction.mockResolvedValueOnce(createMockResponse({}));

      await cellsAPI.deleteNode({uuid, permanently: true});

      expect(mockNodeServiceApi.performAction).toHaveBeenCalledWith('delete', {
        Nodes: [{Uuid: uuid}],
        DeleteOptions: {PermanentDelete: true},
      });
    });

    it('propagates errors when deletion fails', async () => {
      const uuid = 'file-uuid';
      const errorMessage = 'Delete failed';

      mockNodeServiceApi.performAction.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteNode({uuid})).rejects.toThrow(errorMessage);
    });

    it('handles attempts to delete with invalid uuid', async () => {
      const invalidUuid = '';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.performAction.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteNode({uuid: invalidUuid})).rejects.toThrow(errorMessage);
    });

    it('restores a file with the correct uuid', async () => {
      const uuid = 'file-uuid';
      const mockResponse: RestPerformActionResponse = {
        Nodes: [
          {
            Path: '/restored/file.txt',
            Uuid: uuid,
          },
        ],
      } as RestPerformActionResponse;

      mockNodeServiceApi.performAction.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.restoreNode({uuid});

      expect(mockNodeServiceApi.performAction).toHaveBeenCalledWith('restore', {
        Nodes: [{Uuid: uuid}],
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when restore operation fails', async () => {
      const uuid = 'file-uuid';
      const errorMessage = 'Restore failed';

      mockNodeServiceApi.performAction.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.restoreNode({uuid})).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID', async () => {
      const emptyUuid = '';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.performAction.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.restoreNode({uuid: emptyUuid})).rejects.toThrow(errorMessage);
    });

    it('handles restore of non-existent file', async () => {
      const uuid = 'non-existent-uuid';
      const errorMessage = 'File not found';

      mockNodeServiceApi.performAction.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.restoreNode({uuid})).rejects.toThrow(errorMessage);
    });
  });

  describe('moveNode', () => {
    it('moves a file to the target path', async () => {
      const currentPath = '/current/file.txt';
      const targetPath = '/new-location/file.txt';
      const mockResponse: RestPerformActionResponse = {
        Nodes: [
          {
            Path: targetPath,
          },
        ],
      } as RestPerformActionResponse;

      mockNodeServiceApi.performAction.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.moveNode({currentPath, targetPath});

      expect(mockNodeServiceApi.performAction).toHaveBeenCalledWith('move', {
        Nodes: [{Path: currentPath}],
        CopyMoveOptions: {TargetIsParent: true, TargetPath: targetPath},
        AwaitStatus: 'Finished',
        AwaitTimeout: '5000ms',
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when move operation fails', async () => {
      const currentPath = '/current/file.txt';
      const targetPath = '/new-location/file.txt';
      const errorMessage = 'Move operation failed';

      mockNodeServiceApi.performAction.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.moveNode({currentPath, targetPath})).rejects.toThrow(errorMessage);
    });

    it('handles empty current path', async () => {
      const emptyCurrentPath = '';
      const targetPath = '/new-location/file.txt';
      const errorMessage = 'Invalid path';

      mockNodeServiceApi.performAction.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.moveNode({currentPath: emptyCurrentPath, targetPath})).rejects.toThrow(errorMessage);
    });

    it('handles empty target path', async () => {
      const currentPath = '/current/file.txt';
      const emptyTargetPath = '';
      const mockResponse: RestPerformActionResponse = {
        Nodes: [
          {
            Path: emptyTargetPath,
          },
        ],
      } as RestPerformActionResponse;

      mockNodeServiceApi.performAction.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.moveNode({currentPath, targetPath: emptyTargetPath});

      expect(mockNodeServiceApi.performAction).toHaveBeenCalledWith('move', {
        Nodes: [{Path: currentPath}],
        CopyMoveOptions: {TargetIsParent: true, TargetPath: emptyTargetPath},
        AwaitStatus: 'Finished',
        AwaitTimeout: '5000ms',
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles move to root directory', async () => {
      const currentPath = '/current/file.txt';
      const rootPath = '/';
      const mockResponse: RestPerformActionResponse = {
        Nodes: [
          {
            Path: rootPath,
          },
        ],
      } as RestPerformActionResponse;

      mockNodeServiceApi.performAction.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.moveNode({currentPath, targetPath: rootPath});

      expect(mockNodeServiceApi.performAction).toHaveBeenCalledWith('move', {
        Nodes: [{Path: currentPath}],
        CopyMoveOptions: {TargetIsParent: true, TargetPath: rootPath},
        AwaitStatus: 'Finished',
        AwaitTimeout: '5000ms',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('renameNode', () => {
    it('renames a node with the correct parameters', async () => {
      const currentPath = '/folder/old-name.txt';
      const newName = 'new-name.txt';
      const mockResponse: RestPerformActionResponse = {
        Nodes: [
          {
            Path: '/folder/new-name.txt',
          },
        ],
      } as RestPerformActionResponse;

      mockNodeServiceApi.performAction.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.renameNode({currentPath, newName});

      expect(mockNodeServiceApi.performAction).toHaveBeenCalledWith('move', {
        Nodes: [{Path: currentPath}],
        CopyMoveOptions: {TargetIsParent: false, TargetPath: '/folder/new-name.txt'},
        AwaitStatus: 'Finished',
        AwaitTimeout: '5000ms',
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles root level files', async () => {
      const currentPath = '/file.txt';
      const newName = 'renamed.txt';
      const mockResponse: RestPerformActionResponse = {
        Nodes: [
          {
            Path: '/renamed.txt',
          },
        ],
      } as RestPerformActionResponse;

      mockNodeServiceApi.performAction.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.renameNode({currentPath, newName});

      expect(mockNodeServiceApi.performAction).toHaveBeenCalledWith('move', {
        Nodes: [{Path: currentPath}],
        CopyMoveOptions: {TargetIsParent: false, TargetPath: '/renamed.txt'},
        AwaitStatus: 'Finished',
        AwaitTimeout: '5000ms',
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles files in nested directories', async () => {
      const currentPath = '/folder/subfolder/file.txt';
      const newName = 'renamed.txt';
      const mockResponse: RestPerformActionResponse = {
        Nodes: [
          {
            Path: '/folder/subfolder/renamed.txt',
          },
        ],
      } as RestPerformActionResponse;

      mockNodeServiceApi.performAction.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.renameNode({currentPath, newName});

      expect(mockNodeServiceApi.performAction).toHaveBeenCalledWith('move', {
        Nodes: [{Path: currentPath}],
        CopyMoveOptions: {TargetIsParent: false, TargetPath: '/folder/subfolder/renamed.txt'},
        AwaitStatus: 'Finished',
        AwaitTimeout: '5000ms',
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when rename operation fails', async () => {
      const currentPath = '/folder/file.txt';
      const newName = 'renamed.txt';
      const errorMessage = 'Rename operation failed';

      mockNodeServiceApi.performAction.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.renameNode({currentPath, newName})).rejects.toThrow(errorMessage);
    });

    it('handles empty current path', async () => {
      const currentPath = '';
      const newName = 'renamed.txt';
      const errorMessage = 'Invalid path';

      mockNodeServiceApi.performAction.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.renameNode({currentPath, newName})).rejects.toThrow(errorMessage);
    });

    it('handles empty new name', async () => {
      const currentPath = '/folder/file.txt';
      const newName = '';
      const mockResponse: RestPerformActionResponse = {
        Nodes: [
          {
            Path: '/folder/',
          },
        ],
      } as RestPerformActionResponse;

      mockNodeServiceApi.performAction.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.renameNode({currentPath, newName});

      expect(mockNodeServiceApi.performAction).toHaveBeenCalledWith('move', {
        Nodes: [{Path: currentPath}],
        CopyMoveOptions: {TargetIsParent: false, TargetPath: '/folder/'},
        AwaitStatus: 'Finished',
        AwaitTimeout: '5000ms',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('promoteNodeDraft', () => {
    it('promotes a file draft with the correct parameters', async () => {
      const uuid = 'file-uuid';
      const versionId = 'version-uuid';
      const mockResponse = {
        Success: true,
        Node: {
          Uuid: uuid,
          Path: '/test.txt',
        },
      };

      mockNodeServiceApi.promoteVersion.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.promoteNodeDraft({uuid, versionId});

      expect(mockNodeServiceApi.promoteVersion).toHaveBeenCalledWith(uuid, versionId, {Publish: true});
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when promotion fails', async () => {
      const uuid = 'file-uuid';
      const versionId = 'version-uuid';
      const errorMessage = 'Promotion failed';

      mockNodeServiceApi.promoteVersion.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.promoteNodeDraft({uuid, versionId})).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID or versionId', async () => {
      const emptyUuid = '';
      const versionId = 'version-uuid';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.promoteVersion.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.promoteNodeDraft({uuid: emptyUuid, versionId})).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteNodeDraft', () => {
    it('deletes a file draft with the correct parameters', async () => {
      const uuid = 'file-uuid';
      const versionId = 'version-uuid';
      const mockResponse = {
        Success: true,
        Uuid: uuid,
      };

      mockNodeServiceApi.deleteVersion.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.deleteNodeDraft({uuid, versionId});

      expect(mockNodeServiceApi.deleteVersion).toHaveBeenCalledWith(uuid, versionId);
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when deletion fails', async () => {
      const uuid = 'file-uuid';
      const versionId = 'version-uuid';
      const errorMessage = 'Version deletion failed';

      mockNodeServiceApi.deleteVersion.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteNodeDraft({uuid, versionId})).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID or versionId', async () => {
      const uuid = 'file-uuid';
      const emptyVersionId = '';
      const errorMessage = 'Invalid Version ID';

      mockNodeServiceApi.deleteVersion.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteNodeDraft({uuid, versionId: emptyVersionId})).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteNodePublicLink', () => {
    it('deletes a file public link with the correct UUID', async () => {
      const uuid = 'file-uuid';
      const mockResponse = {} as RestPublicLinkDeleteSuccess;

      mockNodeServiceApi.deletePublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.deleteNodePublicLink({uuid});

      expect(mockNodeServiceApi.deletePublicLink).toHaveBeenCalledWith(uuid);
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when link deletion fails', async () => {
      const uuid = 'file-uuid';
      const errorMessage = 'Public link deletion failed';

      mockNodeServiceApi.deletePublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteNodePublicLink({uuid})).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID', async () => {
      const emptyUuid = '';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.deletePublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteNodePublicLink({uuid: emptyUuid})).rejects.toThrow(errorMessage);
    });
  });

  describe('lookupNodeByPath', () => {
    it('retrieves a file by its path', async () => {
      const filePath = `/${TEST_FILE_PATH}`;
      const mockNode: RestNode = {
        Path: filePath,
        Uuid: 'file-uuid',
      } as RestNode;
      const mockResponse: RestNodeCollection = {
        Nodes: [mockNode],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.lookupNodeByPath({path: filePath});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Nodes: [{Path: filePath}]},
        Flags: ['WithPreSignedURLs'],
      });
      expect(result).toEqual(mockNode);
    });

    it('throws an error when file with path is not found', async () => {
      const filePath = '/non-existent-file.txt';
      const mockResponse: RestNodeCollection = {
        Nodes: [],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      await expect(cellsAPI.lookupNodeByPath({path: filePath})).rejects.toThrow(`File not found: ${filePath}`);
    });

    it('propagates errors from the NodeServiceApi', async () => {
      const filePath = `/${TEST_FILE_PATH}`;
      const errorMessage = 'API error';

      mockNodeServiceApi.lookup.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.lookupNodeByPath({path: filePath})).rejects.toThrow(errorMessage);
    });
  });

  describe('lookupNodeByUuid', () => {
    it('retrieves a file by its UUID', async () => {
      const fileUuid = 'file-uuid';
      const mockNode: RestNode = {
        Path: `/${TEST_FILE_PATH}`,
        Uuid: fileUuid,
      } as RestNode;
      const mockResponse: RestNodeCollection = {
        Nodes: [mockNode],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.lookupNodeByUuid({uuid: fileUuid});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Nodes: [{Uuid: fileUuid}]},
        Flags: ['WithPreSignedURLs'],
      });
      expect(result).toEqual(mockNode);
    });

    it('throws an error when file with UUID is not found', async () => {
      const fileUuid = 'non-existent-uuid';
      const mockResponse: RestNodeCollection = {
        Nodes: [],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      await expect(cellsAPI.lookupNodeByUuid({uuid: fileUuid})).rejects.toThrow(`File not found: ${fileUuid}`);
    });

    it('propagates errors from the NodeServiceApi', async () => {
      const fileUuid = 'file-uuid';
      const errorMessage = 'API error';

      mockNodeServiceApi.lookup.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.lookupNodeByUuid({uuid: fileUuid})).rejects.toThrow(errorMessage);
    });
  });

  describe('getNodeVersions', () => {
    it('retrieves versions for a file by UUID', async () => {
      const fileUuid = 'file-uuid';
      const mockVersions = [
        {
          VersionId: 'version-uuid-1',
        },
        {
          VersionId: 'version-uuid-2',
        },
      ] as unknown as RestVersion[];

      const mockResponse = {
        Versions: mockVersions,
      };

      mockNodeServiceApi.nodeVersions = jest.fn().mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.getNodeVersions({uuid: fileUuid});

      expect(mockNodeServiceApi.nodeVersions).toHaveBeenCalledWith(fileUuid, {FilterBy: 'VersionsAll'});
      expect(result).toEqual(mockVersions);
    });

    it('returns empty array when file has no versions', async () => {
      const fileUuid = 'file-uuid';
      const mockResponse = {
        Versions: undefined,
      };

      mockNodeServiceApi.nodeVersions = jest.fn().mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.getNodeVersions({uuid: fileUuid});

      expect(mockNodeServiceApi.nodeVersions).toHaveBeenCalledWith(fileUuid, {FilterBy: 'VersionsAll'});
      expect(result).toEqual([]);
    });

    it('propagates errors from the NodeServiceApi', async () => {
      const fileUuid = 'file-uuid';
      const errorMessage = 'Failed to retrieve versions';

      mockNodeServiceApi.nodeVersions = jest.fn().mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.getNodeVersions({uuid: fileUuid})).rejects.toThrow(errorMessage);
    });
  });

  describe('getNodePublicLink', () => {
    it('retrieves a public link for a file', async () => {
      const uuid = 'file-uuid';
      const mockResponse = {
        Link: {
          Uuid: uuid,
          Label: 'Test Label',
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
        },
      } as RestShareLink;

      mockNodeServiceApi.getPublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.getNodePublicLink({uuid});

      expect(mockNodeServiceApi.getPublicLink).toHaveBeenCalledWith(uuid);
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when link retrieval fails', async () => {
      const uuid = 'file-uuid';
      const errorMessage = 'Link retrieval failed';

      mockNodeServiceApi.getPublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.getNodePublicLink({uuid})).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID', async () => {
      const emptyUuid = '';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.getPublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.getNodePublicLink({uuid: emptyUuid})).rejects.toThrow(errorMessage);
    });
  });

  describe('createNodePublicLink', () => {
    it('creates a public link for a file', async () => {
      const uuid = 'file-uuid';
      const label = 'Test Label';
      const mockResponse = {
        Link: {
          Uuid: uuid,
          Label: label,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
        },
      } as RestShareLink;

      mockNodeServiceApi.createPublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.createNodePublicLink({
        uuid,
        link: {
          Label: label,
          Permissions: ['Preview', 'Download'],
        },
      });

      expect(mockNodeServiceApi.createPublicLink).toHaveBeenCalledWith(uuid, {
        Link: {
          Label: label,
          Permissions: ['Preview', 'Download'],
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('creates a public link without a label', async () => {
      const uuid = 'file-uuid';
      const mockResponse = {
        Link: {
          Uuid: uuid,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
        },
      } as RestShareLink;

      mockNodeServiceApi.createPublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.createNodePublicLink({
        uuid,
        link: {
          Permissions: ['Preview', 'Download'],
        },
      });

      expect(mockNodeServiceApi.createPublicLink).toHaveBeenCalledWith(uuid, {
        Link: {
          Permissions: ['Preview', 'Download'],
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when link creation fails', async () => {
      const uuid = 'file-uuid';
      const label = 'Test Label';
      const errorMessage = 'Link creation failed';

      mockNodeServiceApi.createPublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(
        cellsAPI.createNodePublicLink({
          uuid,
          link: {Label: label, Permissions: ['Preview', 'Download']},
        }),
      ).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID', async () => {
      const emptyUuid = '';
      const label = 'Test Label';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.createPublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(
        cellsAPI.createNodePublicLink({
          uuid: emptyUuid,
          link: {Label: label, Permissions: ['Preview', 'Download']},
        }),
      ).rejects.toThrow(errorMessage);
    });

    it('creates a password-protected public link', async () => {
      const uuid = 'file-uuid';
      const label = 'Protected File';
      const password = 'secret123';
      const mockResponse = {
        Link: {
          Uuid: uuid,
          Label: label,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
          PasswordRequired: true,
        },
      } as RestShareLink;

      mockNodeServiceApi.createPublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.createNodePublicLink({
        uuid,
        link: {
          Label: label,
          Permissions: ['Preview', 'Download'],
        },
        createPassword: password,
        passwordEnabled: true,
      });

      expect(mockNodeServiceApi.createPublicLink).toHaveBeenCalledWith(uuid, {
        Link: {
          Label: label,
          Permissions: ['Preview', 'Download'],
          PasswordRequired: true,
        },
        CreatePassword: password,
        PasswordEnabled: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it('creates a public link with expiration time', async () => {
      const uuid = 'file-uuid';
      const label = 'Temporary File';
      const accessEnd = '1765839600';
      const mockResponse = {
        Link: {
          Uuid: uuid,
          Label: label,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
          AccessEnd: accessEnd,
        },
      } as RestShareLink;

      mockNodeServiceApi.createPublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.createNodePublicLink({
        uuid,
        link: {
          Label: label,
          Permissions: ['Preview', 'Download'],
          AccessEnd: accessEnd,
        },
      });

      expect(mockNodeServiceApi.createPublicLink).toHaveBeenCalledWith(uuid, {
        Link: {
          Label: label,
          Permissions: ['Preview', 'Download'],
          AccessEnd: accessEnd,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('creates a password-protected link with expiration', async () => {
      const uuid = 'file-uuid';
      const label = 'Secure Temporary File';
      const password = 'secret123';
      const accessEnd = '1765839600';
      const mockResponse = {
        Link: {
          Uuid: uuid,
          Label: label,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
          PasswordRequired: true,
          AccessEnd: accessEnd,
        },
      } as RestShareLink;

      mockNodeServiceApi.createPublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.createNodePublicLink({
        uuid,
        link: {
          Label: label,
          Permissions: ['Preview', 'Download'],
          AccessEnd: accessEnd,
        },
        createPassword: password,
        passwordEnabled: true,
      });

      expect(mockNodeServiceApi.createPublicLink).toHaveBeenCalledWith(uuid, {
        Link: {
          Label: label,
          Permissions: ['Preview', 'Download'],
          PasswordRequired: true,
          AccessEnd: accessEnd,
        },
        CreatePassword: password,
        PasswordEnabled: true,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateNodePublicLink', () => {
    it('updates a public link label', async () => {
      const linkUuid = 'link-uuid';
      const newLabel = 'Updated Label';
      const mockResponse = {
        Link: {
          Uuid: linkUuid,
          Label: newLabel,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
        },
      } as RestShareLink;

      mockNodeServiceApi.updatePublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.updateNodePublicLink({
        linkUuid,
        link: {
          Label: newLabel,
        },
      });

      expect(mockNodeServiceApi.updatePublicLink).toHaveBeenCalledWith(linkUuid, {
        Link: {
          Label: newLabel,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('sets initial password on existing link', async () => {
      const linkUuid = 'link-uuid';
      const password = 'newPassword123';
      const mockResponse = {
        Link: {
          Uuid: linkUuid,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
          PasswordRequired: true,
        },
      } as RestShareLink;

      mockNodeServiceApi.updatePublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.updateNodePublicLink({
        linkUuid,
        link: {},
        createPassword: password,
        passwordEnabled: true,
      });

      expect(mockNodeServiceApi.updatePublicLink).toHaveBeenCalledWith(linkUuid, {
        Link: {
          PasswordRequired: true,
        },
        CreatePassword: password,
        PasswordEnabled: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it('updates existing password', async () => {
      const linkUuid = 'link-uuid';
      const newPassword = 'updatedPassword456';
      const mockResponse = {
        Link: {
          Uuid: linkUuid,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
          PasswordRequired: true,
        },
      } as RestShareLink;

      mockNodeServiceApi.updatePublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.updateNodePublicLink({
        linkUuid,
        link: {},
        updatePassword: newPassword,
        passwordEnabled: true,
      });

      expect(mockNodeServiceApi.updatePublicLink).toHaveBeenCalledWith(linkUuid, {
        Link: {
          PasswordRequired: true,
        },
        UpdatePassword: newPassword,
        PasswordEnabled: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it('removes password protection from link', async () => {
      const linkUuid = 'link-uuid';
      const mockResponse = {
        Link: {
          Uuid: linkUuid,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
          PasswordRequired: false,
        },
      } as RestShareLink;

      mockNodeServiceApi.updatePublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.updateNodePublicLink({
        linkUuid,
        link: {},
        passwordEnabled: false,
      });

      expect(mockNodeServiceApi.updatePublicLink).toHaveBeenCalledWith(linkUuid, {
        Link: {
          PasswordRequired: false,
        },
        PasswordEnabled: false,
      });
      expect(result).toEqual(mockResponse);
    });

    it('sets expiration time on link', async () => {
      const linkUuid = 'link-uuid';
      const accessEnd = '1765839600';
      const mockResponse = {
        Link: {
          Uuid: linkUuid,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
          AccessEnd: accessEnd,
        },
      } as RestShareLink;

      mockNodeServiceApi.updatePublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.updateNodePublicLink({
        linkUuid,
        link: {
          AccessEnd: accessEnd,
        },
      });

      expect(mockNodeServiceApi.updatePublicLink).toHaveBeenCalledWith(linkUuid, {
        Link: {
          AccessEnd: accessEnd,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('removes expiration time from link', async () => {
      const linkUuid = 'link-uuid';
      const mockResponse = {
        Link: {
          Uuid: linkUuid,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
        },
      } as RestShareLink;

      mockNodeServiceApi.updatePublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.updateNodePublicLink({
        linkUuid,
        link: {},
      });

      expect(mockNodeServiceApi.updatePublicLink).toHaveBeenCalledWith(linkUuid, {
        Link: {},
      });
      expect(result).toEqual(mockResponse);
    });

    it('updates multiple properties at once', async () => {
      const linkUuid = 'link-uuid';
      const newLabel = 'Updated Secure File';
      const newPassword = 'newPassword789';
      const accessEnd = '1765839600';
      const mockResponse = {
        Link: {
          Uuid: linkUuid,
          Label: newLabel,
          LinkHash: 'hash123',
          LinkUrl: 'https://example.com/link',
          Permissions: ['Preview', 'Download'],
          PasswordRequired: true,
          AccessEnd: accessEnd,
        },
      } as RestShareLink;

      mockNodeServiceApi.updatePublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.updateNodePublicLink({
        linkUuid,
        link: {
          Label: newLabel,
          AccessEnd: accessEnd,
        },
        updatePassword: newPassword,
        passwordEnabled: true,
      });

      expect(mockNodeServiceApi.updatePublicLink).toHaveBeenCalledWith(linkUuid, {
        Link: {
          Label: newLabel,
          PasswordRequired: true,
          AccessEnd: accessEnd,
        },
        UpdatePassword: newPassword,
        PasswordEnabled: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when update fails', async () => {
      const linkUuid = 'link-uuid';
      const errorMessage = 'Update failed';

      mockNodeServiceApi.updatePublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.updateNodePublicLink({linkUuid, link: {Label: 'New Label'}})).rejects.toThrow(errorMessage);
    });
  });

  describe('searchNodes', () => {
    it('searches for files by filename phrase', async () => {
      const searchPhrase = 'test';
      const mockResponse: RestNodeCollection = {
        Nodes: [
          {
            Path: '/test.txt',
            Uuid: 'file-uuid-1',
          },
          {
            Path: '/folder/test-file.txt',
            Uuid: 'file-uuid-2',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({phrase: searchPhrase});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
    });

    it('searches for deleted files when deleted is true', async () => {
      const searchPhrase = 'test';
      const mockResponse: RestNodeCollection = {
        Nodes: [
          {
            Path: '/deleted-test.txt',
            Uuid: 'file-uuid-1',
          },
          {
            Path: '/folder/deleted-test-file.txt',
            Uuid: 'file-uuid-2',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({phrase: searchPhrase, deleted: true});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Only',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
    });

    it('uses default values when limit and offset are not provided', async () => {
      const searchPhrase = 'test';
      const mockResponse: RestNodeCollection = {
        Nodes: [
          {
            Path: '/test.txt',
            Uuid: 'file-uuid-1',
          },
          {
            Path: '/folder/test-file.txt',
            Uuid: 'file-uuid-2',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({phrase: searchPhrase});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
    });

    it('respects custom limit and offset parameters', async () => {
      const searchPhrase = 'test';
      const mockResponse: RestNodeCollection = {
        Nodes: [
          {
            Path: '/test.txt',
            Uuid: 'file-uuid-1',
          },
          {
            Path: '/folder/test-file.txt',
            Uuid: 'file-uuid-2',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({
        phrase: searchPhrase,
        limit: 5,
        offset: 10,
      });

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '5',
        Offset: '10',
      });
      expect(result).toEqual(mockResponse);
    });

    it('respects custom sorting parameters', async () => {
      const searchPhrase = 'test';
      const mockResponse: RestNodeCollection = {
        Nodes: [
          {
            Path: '/test.txt',
            Uuid: 'file-uuid-1',
          },
          {
            Path: '/folder/test-file.txt',
            Uuid: 'file-uuid-2',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({
        phrase: searchPhrase,
        sortBy: 'name',
        sortDirection: 'asc',
      });

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
        SortField: 'name',
        SortDirDesc: false,
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles descending sort direction', async () => {
      const searchPhrase = 'test';
      const mockResponse: RestNodeCollection = {
        Nodes: [
          {
            Path: '/test.txt',
            Uuid: 'file-uuid-1',
          },
          {
            Path: '/folder/test-file.txt',
            Uuid: 'file-uuid-2',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({
        phrase: searchPhrase,
        sortBy: 'size',
        sortDirection: 'desc',
      });

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
        SortField: 'size',
        SortDirDesc: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it('filters by type when provided', async () => {
      const searchPhrase = 'test';
      const mockResponse: RestNodeCollection = {
        Nodes: [
          {
            Path: '/test.txt',
            Uuid: 'file-uuid-1',
            Type: 'LEAF',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({
        phrase: searchPhrase,
        type: 'LEAF',
      });

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'LEAF',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
    });

    it('returns empty collection when no files match search phrase', async () => {
      const searchPhrase = 'nonexistent';
      const mockResponse: RestNodeCollection = {
        Nodes: [],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({phrase: searchPhrase});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles empty search phrase', async () => {
      const searchPhrase = '';
      const mockResponse: RestNodeCollection = {
        Nodes: [],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({phrase: searchPhrase});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
    });

    it('filters by tags when provided', async () => {
      const searchPhrase = 'test';
      const tags = ['tag1', 'tag2'];
      const mockResponse: RestNodeCollection = {
        Nodes: [
          {
            Path: '/test.txt',
            Uuid: 'file-uuid-1',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({phrase: searchPhrase, tags});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [{Namespace: 'usermeta-tags', Term: JSON.stringify(tags.join(','))}],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles empty tags array', async () => {
      const searchPhrase = 'test';
      const tags: string[] = [];
      const mockResponse: RestNodeCollection = {
        Nodes: [
          {
            Path: '/test.txt',
            Uuid: 'file-uuid-1',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({phrase: searchPhrase, tags});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
    });

    it('searches for files within a specific path when provided', async () => {
      const searchPhrase = 'test';
      const specificPath = '/conversations/abc123';
      const mockResponse: RestNodeCollection = {
        Nodes: [
          {
            Path: '/conversations/abc123/test.txt',
            Uuid: 'file-uuid-1',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({phrase: searchPhrase, path: specificPath});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: specificPath}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
    });

    it('uses default root path when path is not provided', async () => {
      const searchPhrase = 'test';
      const mockResponse: RestNodeCollection = {
        Nodes: [
          {
            Path: '/test.txt',
            Uuid: 'file-uuid-1',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchNodes({phrase: searchPhrase});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Scope: {Root: {Path: '/'}, Recursive: true},
        Filters: {
          Text: {SearchIn: 'BaseName', Term: searchPhrase},
          Type: 'UNKNOWN',
          Status: {
            Deleted: 'Not',
          },
          Metadata: [],
        },
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createFile', () => {
    it('creates a file with the correct parameters and returns the response', async () => {
      const path = '/test.txt';
      const uuid = 'file-uuid';
      const versionId = 'version-uuid';
      const mockResponse = {
        Nodes: [
          {
            Path: path,
            Uuid: uuid,
            Type: 'LEAF',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.create.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.createFile({path, uuid, versionId});

      expect(mockNodeServiceApi.create).toHaveBeenCalledWith({
        Inputs: [
          {
            Type: 'LEAF',
            Locator: {Path: path.normalize('NFC')},
            ResourceUuid: uuid,
            VersionId: versionId,
          },
        ],
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when file creation fails', async () => {
      const path = '/test.txt';
      const uuid = 'file-uuid';
      const versionId = 'version-uuid';
      const errorMessage = 'File creation failed';

      mockNodeServiceApi.create.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.createFile({path, uuid, versionId})).rejects.toThrow(errorMessage);
    });

    it('handles empty path and returns the response', async () => {
      const path = '';
      const uuid = 'file-uuid';
      const versionId = 'version-uuid';
      const mockResponse = {
        Nodes: [
          {
            Path: path,
            Uuid: uuid,
            Type: 'LEAF',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.create.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.createFile({path, uuid, versionId});

      expect(mockNodeServiceApi.create).toHaveBeenCalledWith({
        Inputs: [
          {
            Type: 'LEAF',
            Locator: {Path: path.normalize('NFC')},
            ResourceUuid: uuid,
            VersionId: versionId,
          },
        ],
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles empty UUID', async () => {
      const path = '/test.txt';
      const uuid = '';
      const versionId = 'version-uuid';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.create.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.createFile({path, uuid, versionId})).rejects.toThrow(errorMessage);
    });
  });

  describe('createFolder', () => {
    it('creates a folder with the correct parameters and returns the response', async () => {
      const path = '/test-folder';
      const uuid = 'folder-uuid';
      const mockResponse = {
        Nodes: [
          {
            Path: path,
            Uuid: uuid,
            Type: 'COLLECTION',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.create.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.createFolder({path, uuid});

      expect(mockNodeServiceApi.create).toHaveBeenCalledWith({
        Inputs: [
          {
            Type: 'COLLECTION',
            Locator: {Path: path.normalize('NFC')},
            ResourceUuid: uuid,
            VersionId: '',
          },
        ],
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when folder creation fails', async () => {
      const path = '/test-folder';
      const uuid = 'folder-uuid';
      const errorMessage = 'Folder creation failed';

      mockNodeServiceApi.create.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.createFolder({path, uuid})).rejects.toThrow(errorMessage);
    });

    it('handles empty path and returns the response', async () => {
      const path = '';
      const uuid = 'folder-uuid';
      const mockResponse = {
        Nodes: [
          {
            Path: path,
            Uuid: uuid,
            Type: 'COLLECTION',
          },
        ],
      } as RestNodeCollection;

      mockNodeServiceApi.create.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.createFolder({path, uuid});

      expect(mockNodeServiceApi.create).toHaveBeenCalledWith({
        Inputs: [
          {
            Type: 'COLLECTION',
            Locator: {Path: path.normalize('NFC')},
            ResourceUuid: uuid,
            VersionId: '',
          },
        ],
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles empty UUID', async () => {
      const path = '/test-folder';
      const uuid = '';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.create.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.createFolder({path, uuid})).rejects.toThrow(errorMessage);
    });
  });

  describe('getAllTags', () => {
    it('retrieves all tags successfully', async () => {
      const mockResponse = {
        Values: ['tag1', 'tag2', 'tag3'],
      };

      mockNodeServiceApi.listNamespaceValues = jest.fn().mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.getAllTags();

      expect(mockNodeServiceApi.listNamespaceValues).toHaveBeenCalledWith('usermeta-tags');
      expect(result).toEqual(mockResponse);
    });

    it('returns empty array when no tags exist', async () => {
      const mockResponse = {
        Values: [],
      };

      mockNodeServiceApi.listNamespaceValues = jest.fn().mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.getAllTags();

      expect(mockNodeServiceApi.listNamespaceValues).toHaveBeenCalledWith('usermeta-tags');
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when tag retrieval fails', async () => {
      const errorMessage = 'Failed to retrieve tags';

      mockNodeServiceApi.listNamespaceValues = jest.fn().mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.getAllTags()).rejects.toThrow(errorMessage);
    });
  });

  describe('setNodeTags', () => {
    it('sets tags for a node successfully', async () => {
      const uuid = 'file-uuid';
      const tags = ['tag1', 'tag2', 'tag3'];
      const mockResponse = {
        Uuid: uuid,
        Meta: {
          'usermeta-tags': tags.join(','),
        },
      };

      mockNodeServiceApi.patchNode = jest.fn().mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.setNodeTags({uuid, tags});

      expect(mockNodeServiceApi.patchNode).toHaveBeenCalledWith(uuid, {
        MetaUpdates: [
          {
            Operation: 'PUT',
            UserMeta: {Namespace: 'usermeta-tags', JsonValue: `"${tags.join(',')}"`},
          },
        ],
      });
      expect(result).toEqual(mockResponse);
    });

    it('sets empty tags array successfully', async () => {
      const uuid = 'file-uuid';
      const tags: string[] = [];
      const mockResponse = {
        Uuid: uuid,
        Meta: {
          'usermeta-tags': '',
        },
      };

      mockNodeServiceApi.patchNode = jest.fn().mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.setNodeTags({uuid, tags});

      expect(mockNodeServiceApi.patchNode).toHaveBeenCalledWith(uuid, {
        MetaUpdates: [
          {
            Operation: 'DELETE',
            UserMeta: {Namespace: 'usermeta-tags', JsonValue: '""'},
          },
        ],
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when setting tags fails', async () => {
      const uuid = 'file-uuid';
      const tags = ['tag1', 'tag2'];
      const errorMessage = 'Failed to set tags';

      mockNodeServiceApi.patchNode = jest.fn().mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.setNodeTags({uuid, tags})).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID', async () => {
      const uuid = '';
      const tags = ['tag1', 'tag2'];
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.patchNode = jest.fn().mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.setNodeTags({uuid, tags})).rejects.toThrow(errorMessage);
    });
  });
});

const TEST_FILE_NAME = 'test.txt';
const TEST_FILE_CONTENT = 'test content';
const TEST_FILE_TYPE = 'text/plain';
const TEST_FOLDER_PATH = 'folder';
const TEST_FILE_PATH = `${TEST_FOLDER_PATH}/${TEST_FILE_NAME}`;
const MOCKED_UUID = 'mocked-uuid';

function createMockResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {headers: {}} as any,
  } as AxiosResponse;
}

class MockFile {
  name: string;
  type: string;
  size: number;
  content: string;
  lastModified: number = Date.now();
  webkitRelativePath: string = '';

  constructor(content: string[], name: string, options?: {type: string}) {
    this.content = content.join('');
    this.name = name;
    this.type = options?.type || '';
    this.size = this.content.length;
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(0));
  }

  slice(): Blob {
    return new Blob();
  }

  stream(): ReadableStream {
    return new ReadableStream();
  }

  text(): Promise<string> {
    return Promise.resolve(this.content);
  }
}

const File = global.File || MockFile;
