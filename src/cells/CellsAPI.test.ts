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
    expect(S3Service).toHaveBeenCalledWith(cellsConfigMock.s3);
  });

  describe('uploadFileDraft', () => {
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

      await cellsAPI.uploadFileDraft({
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
        {signal: undefined},
      );

      expect(mockStorage.putObject).toHaveBeenCalledWith({
        path: TEST_FILE_PATH,
        file: testFile,
        metadata: {
          'Draft-Mode': 'true',
          'Create-Resource-Uuid': MOCKED_UUID,
          'Create-Version-Id': MOCKED_UUID,
        },
        signal: undefined,
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

      await cellsAPI.uploadFileDraft({
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

      await cellsAPI.uploadFileDraft({
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
        cellsAPI.uploadFileDraft({uuid: MOCKED_UUID, versionId: MOCKED_UUID, path: TEST_FILE_PATH, file: testFile}),
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
        cellsAPI.uploadFileDraft({uuid: MOCKED_UUID, versionId: MOCKED_UUID, path: TEST_FILE_PATH, file: testFile}),
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

      await cellsAPI.uploadFileDraft({uuid: MOCKED_UUID, versionId: MOCKED_UUID, path: '', file: testFile});

      expect(mockNodeServiceApi.createCheck).toHaveBeenCalledWith(
        {
          Inputs: [{Type: 'LEAF', Locator: {Path: '', Uuid: MOCKED_UUID}, VersionId: MOCKED_UUID}],
          FindAvailablePath: true,
        },
        {signal: undefined},
      );

      expect(mockStorage.putObject).toHaveBeenCalledWith({
        path: '',
        file: testFile,
        metadata: {
          'Draft-Mode': 'true',
          'Create-Resource-Uuid': MOCKED_UUID,
          'Create-Version-Id': MOCKED_UUID,
        },
        signal: undefined,
      });
    });
  });

  describe('getFile', () => {
    it('retrieves a file by ID', async () => {
      const fileId = 'file-uuid';
      const mockNode: Partial<RestNode> = {
        Path: TEST_FILE_PATH,
        Uuid: fileId,
      };

      mockNodeServiceApi.getByUuid.mockResolvedValueOnce(createMockResponse(mockNode as RestNode));

      const result = await cellsAPI.getFile({id: fileId});

      expect(mockNodeServiceApi.getByUuid).toHaveBeenCalledWith(fileId);
      expect(result).toEqual(mockNode);
    });

    it('propagates errors when file retrieval fails', async () => {
      const fileId = 'file-uuid';
      const errorMessage = 'File not found';

      mockNodeServiceApi.getByUuid.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.getFile({id: fileId})).rejects.toThrow(errorMessage);
    });

    it('handles empty ID', async () => {
      const emptyId = '';

      await expect(cellsAPI.getFile({id: emptyId})).rejects.toThrow();
    });
  });

  describe('getAllFiles', () => {
    it('retrieves all files with the correct parameters', async () => {
      const mockCollection: Partial<RestNodeCollection> = {
        Nodes: [
          {Path: '/file1.txt', Uuid: 'uuid1'},
          {Path: '/file2.txt', Uuid: 'uuid2'},
        ],
      };

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockCollection as RestNodeCollection));

      const result = await cellsAPI.getAllFiles({path: TEST_FILE_PATH});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Locators: {Many: [{Path: `${TEST_FILE_PATH}/*`}]},
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
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

      const result = await cellsAPI.getAllFiles({path: TEST_FILE_PATH});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Locators: {Many: [{Path: `${TEST_FILE_PATH}/*`}]},
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
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

      const result = await cellsAPI.getAllFiles({
        path: TEST_FILE_PATH,
        limit: 5,
        offset: 10,
      });

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Locators: {Many: [{Path: `${TEST_FILE_PATH}/*`}]},
        Flags: ['WithPreSignedURLs'],
        Limit: '5',
        Offset: '10',
      });
      expect(result).toEqual(mockCollection);
    });

    it('propagates errors when lookup fails', async () => {
      const errorMessage = 'Lookup failed';

      mockNodeServiceApi.lookup.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.getAllFiles({path: TEST_FILE_PATH})).rejects.toThrow(errorMessage);
    });

    it('returns empty collection when no files exist', async () => {
      const emptyCollection: Partial<RestNodeCollection> = {
        Nodes: [],
      };

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(emptyCollection as RestNodeCollection));

      const result = await cellsAPI.getAllFiles({path: TEST_FILE_PATH});
      expect(result).toEqual(emptyCollection);
    });
  });

  describe('deleteFile', () => {
    it('deletes a file with the correct uuid', async () => {
      const uuid = 'file-uuid';

      mockNodeServiceApi.performAction.mockResolvedValueOnce(createMockResponse({}));

      await cellsAPI.deleteFile({uuid});

      expect(mockNodeServiceApi.performAction).toHaveBeenCalledWith('delete', {
        Nodes: [{Uuid: uuid}],
      });
    });

    it('propagates errors when deletion fails', async () => {
      const uuid = 'file-uuid';
      const errorMessage = 'Delete failed';

      mockNodeServiceApi.performAction.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteFile({uuid})).rejects.toThrow(errorMessage);
    });

    it('handles attempts to delete with invalid uuid', async () => {
      const invalidUuid = '';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.performAction.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteFile({uuid: invalidUuid})).rejects.toThrow(errorMessage);
    });
  });

  describe('promoteFileDraft', () => {
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

      const result = await cellsAPI.promoteFileDraft({uuid, versionId});

      expect(mockNodeServiceApi.promoteVersion).toHaveBeenCalledWith(uuid, versionId, {Publish: true});
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when promotion fails', async () => {
      const uuid = 'file-uuid';
      const versionId = 'version-uuid';
      const errorMessage = 'Promotion failed';

      mockNodeServiceApi.promoteVersion.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.promoteFileDraft({uuid, versionId})).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID or versionId', async () => {
      const emptyUuid = '';
      const versionId = 'version-uuid';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.promoteVersion.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.promoteFileDraft({uuid: emptyUuid, versionId})).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteFileDraft', () => {
    it('deletes a file draft with the correct parameters', async () => {
      const uuid = 'file-uuid';
      const versionId = 'version-uuid';
      const mockResponse = {
        Success: true,
        Uuid: uuid,
      };

      mockNodeServiceApi.deleteVersion.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.deleteFileDraft({uuid, versionId});

      expect(mockNodeServiceApi.deleteVersion).toHaveBeenCalledWith(uuid, versionId);
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when deletion fails', async () => {
      const uuid = 'file-uuid';
      const versionId = 'version-uuid';
      const errorMessage = 'Version deletion failed';

      mockNodeServiceApi.deleteVersion.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteFileDraft({uuid, versionId})).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID or versionId', async () => {
      const uuid = 'file-uuid';
      const emptyVersionId = '';
      const errorMessage = 'Invalid Version ID';

      mockNodeServiceApi.deleteVersion.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteFileDraft({uuid, versionId: emptyVersionId})).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteFilePublicLink', () => {
    it('deletes a file public link with the correct UUID', async () => {
      const uuid = 'file-uuid';
      const mockResponse = {} as RestPublicLinkDeleteSuccess;

      mockNodeServiceApi.deletePublicLink.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.deleteFilePublicLink({uuid});

      expect(mockNodeServiceApi.deletePublicLink).toHaveBeenCalledWith(uuid);
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when link deletion fails', async () => {
      const uuid = 'file-uuid';
      const errorMessage = 'Public link deletion failed';

      mockNodeServiceApi.deletePublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteFilePublicLink({uuid})).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID', async () => {
      const emptyUuid = '';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.deletePublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.deleteFilePublicLink({uuid: emptyUuid})).rejects.toThrow(errorMessage);
    });
  });

  describe('lookupFileByPath', () => {
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

      const result = await cellsAPI.lookupFileByPath({path: filePath});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Locators: {Many: [{Path: filePath}]},
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

      await expect(cellsAPI.lookupFileByPath({path: filePath})).rejects.toThrow(`File not found: ${filePath}`);
    });

    it('propagates errors from the NodeServiceApi', async () => {
      const filePath = `/${TEST_FILE_PATH}`;
      const errorMessage = 'API error';

      mockNodeServiceApi.lookup.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.lookupFileByPath({path: filePath})).rejects.toThrow(errorMessage);
    });
  });

  describe('lookupFileByUuid', () => {
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

      const result = await cellsAPI.lookupFileByUuid({uuid: fileUuid});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Locators: {Many: [{Uuid: fileUuid}]},
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

      await expect(cellsAPI.lookupFileByUuid({uuid: fileUuid})).rejects.toThrow(`File not found: ${fileUuid}`);
    });

    it('propagates errors from the NodeServiceApi', async () => {
      const fileUuid = 'file-uuid';
      const errorMessage = 'API error';

      mockNodeServiceApi.lookup.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.lookupFileByUuid({uuid: fileUuid})).rejects.toThrow(errorMessage);
    });
  });

  describe('getFileVersions', () => {
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

      const result = await cellsAPI.getFileVersions({uuid: fileUuid});

      expect(mockNodeServiceApi.nodeVersions).toHaveBeenCalledWith(fileUuid, {FilterBy: 'VersionsAll'});
      expect(result).toEqual(mockVersions);
    });

    it('returns undefined when file has no versions', async () => {
      const fileUuid = 'file-uuid';
      const mockResponse = {
        Versions: undefined,
      };

      mockNodeServiceApi.nodeVersions = jest.fn().mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.getFileVersions({uuid: fileUuid});

      expect(mockNodeServiceApi.nodeVersions).toHaveBeenCalledWith(fileUuid, {FilterBy: 'VersionsAll'});
      expect(result).toBeUndefined();
    });

    it('propagates errors from the NodeServiceApi', async () => {
      const fileUuid = 'file-uuid';
      const errorMessage = 'Failed to retrieve versions';

      mockNodeServiceApi.nodeVersions = jest.fn().mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.getFileVersions({uuid: fileUuid})).rejects.toThrow(errorMessage);
    });
  });

  describe('getFilePublicLink', () => {
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

      const result = await cellsAPI.getFilePublicLink({uuid});

      expect(mockNodeServiceApi.getPublicLink).toHaveBeenCalledWith(uuid);
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors when link retrieval fails', async () => {
      const uuid = 'file-uuid';
      const errorMessage = 'Link retrieval failed';

      mockNodeServiceApi.getPublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.getFilePublicLink({uuid})).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID', async () => {
      const emptyUuid = '';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.getPublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.getFilePublicLink({uuid: emptyUuid})).rejects.toThrow(errorMessage);
    });
  });

  describe('createFilePublicLink', () => {
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

      const result = await cellsAPI.createFilePublicLink({uuid, label});

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

      const result = await cellsAPI.createFilePublicLink({uuid});

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

      await expect(cellsAPI.createFilePublicLink({uuid, label})).rejects.toThrow(errorMessage);
    });

    it('handles empty UUID', async () => {
      const emptyUuid = '';
      const label = 'Test Label';
      const errorMessage = 'Invalid UUID';

      mockNodeServiceApi.createPublicLink.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.createFilePublicLink({uuid: emptyUuid, label})).rejects.toThrow(errorMessage);
    });
  });

  describe('searchFiles', () => {
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

      const result = await cellsAPI.searchFiles({phrase: searchPhrase});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Query: {FileName: searchPhrase, Type: 'LEAF'},
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

      const result = await cellsAPI.searchFiles({phrase: searchPhrase});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Query: {FileName: searchPhrase, Type: 'LEAF'},
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

      const result = await cellsAPI.searchFiles({
        phrase: searchPhrase,
        limit: 5,
        offset: 10,
      });

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Query: {FileName: searchPhrase, Type: 'LEAF'},
        Flags: ['WithPreSignedURLs'],
        Limit: '5',
        Offset: '10',
      });
      expect(result).toEqual(mockResponse);
    });

    it('returns empty collection when no files match search phrase', async () => {
      const searchPhrase = 'nonexistent';
      const mockResponse: RestNodeCollection = {
        Nodes: [],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchFiles({phrase: searchPhrase});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Query: {FileName: searchPhrase, Type: 'LEAF'},
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
    });

    it('propagates errors from the NodeServiceApi', async () => {
      const searchPhrase = 'test';
      const errorMessage = 'Search failed';

      mockNodeServiceApi.lookup.mockRejectedValueOnce(new Error(errorMessage));

      await expect(cellsAPI.searchFiles({phrase: searchPhrase})).rejects.toThrow(errorMessage);
    });

    it('handles empty search phrase', async () => {
      const searchPhrase = '';
      const mockResponse: RestNodeCollection = {
        Nodes: [],
      } as RestNodeCollection;

      mockNodeServiceApi.lookup.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await cellsAPI.searchFiles({phrase: searchPhrase});

      expect(mockNodeServiceApi.lookup).toHaveBeenCalledWith({
        Query: {FileName: searchPhrase, Type: 'LEAF'},
        Flags: ['WithPreSignedURLs'],
        Limit: '10',
        Offset: '0',
      });
      expect(result).toEqual(mockResponse);
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
