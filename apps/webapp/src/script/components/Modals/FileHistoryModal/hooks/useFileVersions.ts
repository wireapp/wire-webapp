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

import {useCallback, useEffect, useState} from 'react';

import is from '@sindresorhus/is';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {RestVersion} from 'cells-sdk-ts';
import {container} from 'tsyringe';

import {parseQualifiedId} from '@wireapp/core';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/RootProvider';
import {getLogger} from 'Util/logger';
import {forcedDownloadFile, getFileExtension, getName} from 'Util/util';

import {FileInfo, FileVersion} from '../types';
import {groupVersionsByDate} from '../utils/fileVersionUtils';

const logger = getLogger('FileVersionHistoryModal');

type UseFileVersionsResult = {
  readonly fileInfo: FileInfo | undefined;
  readonly fileVersions: Record<string, FileVersion[]>;
  readonly isLoading: boolean;
  readonly error: string | undefined;
  readonly handleDownload: (url: string) => Promise<void>;
  readonly handleRestore: () => Promise<void>;
  readonly setToBeRestoredVersionId: (versionId: string | undefined) => void;
  readonly toBeRestoredVersionId: string | undefined;
};

type FileHistoryCopy = {
  readonly failedToLoadVersions: string;
  readonly failedToRestore: string;
  readonly invalidNodeData: string;
};

/**
 * Hook to fetch and manage file versions for a given node UUID.
 */
export const useFileVersions = (
  nodeUuid?: string,
  onClose?: () => void,
  onRestore?: () => void,
  fileHistoryCopy?: FileHistoryCopy,
): UseFileVersionsResult => {
  const {fireAndForgetInvoker} = useApplicationContext();
  const failedToLoadVersions = fileHistoryCopy?.failedToLoadVersions ?? 'fileHistoryModal.failedToLoadVersions';
  const failedToRestore = fileHistoryCopy?.failedToRestore ?? 'fileHistoryModal.failedToRestore';
  const invalidNodeData = fileHistoryCopy?.invalidNodeData ?? 'fileHistoryModal.invalidNodeData';
  const [fileInfo, setFileInfo] = useState<FileInfo>();
  const [fileVersions, setFileVersions] = useState<Record<string, FileVersion[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string>();
  const [toBeRestoredVersionId, setToBeRestoredVersionId] = useState<string>();

  useEffect(() => {
    if (!is.nonEmptyString(nodeUuid)) {
      setFileInfo(undefined);
      setFileVersions({});
      return;
    }

    const fileNodeUuid = nodeUuid;

    async function loadFileVersions(): Promise<void> {
      setIsLoading(true);
      setError(undefined);
      const cellsRepository = container.resolve(CellsRepository);
      try {
        // Fetch the node details and versions in parallel
        const [node, versions] = await Promise.all([
          cellsRepository.getNode({uuid: fileNodeUuid}),
          cellsRepository.getNodeVersions({uuid: fileNodeUuid, flags: ['WithPreSignedURLs']}),
        ]);

        // Validate node data
        if (node?.Path == null || node.Path === '') {
          throw new Error(invalidNodeData);
        }

        // Extract file info from the node
        const info: FileInfo = {
          name: getName(node.Path),
          extension: getFileExtension(node.Path),
        };

        setFileInfo(info);

        const nodeVersions = versions ?? [];
        const ownerNamesByUserIdMap = getOwnerNamesByUserIdMap(nodeVersions);
        const groupedVersions = groupVersionsByDate(nodeVersions, version => {
          const ownerQualifiedId = parseOwnerQualifiedId(version.OwnerUuid);
          if (is.undefined(ownerQualifiedId)) {
            return undefined;
          }

          return ownerNamesByUserIdMap.get(ownerQualifiedId.id);
        });
        setFileVersions(groupedVersions);
      } catch (err: unknown) {
        const errorMessage = is.error(err) ? err.message : failedToLoadVersions;
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    fireAndForgetInvoker.fireAndForget(loadFileVersions);
  }, [failedToLoadVersions, fireAndForgetInvoker, invalidNodeData, nodeUuid]);

  const reset = useCallback(() => {
    setFileInfo(undefined);
    setFileVersions({});
    setIsLoading(false);
    setError(undefined);
    setToBeRestoredVersionId(undefined);
    onClose?.();
    onRestore?.();
  }, [onClose, onRestore]);

  const handleDownload = useCallback(
    async (url: string) => {
      if (isDownloading) {
        return;
      }
      setIsDownloading(true);
      setError(undefined);
      try {
        await forcedDownloadFile({url, name: fileInfo?.name ?? 'file'});
      } finally {
        setIsDownloading(false);
      }
    },
    [isDownloading, fileInfo],
  );

  const handleRestore = useCallback(async () => {
    if (!is.nonEmptyString(toBeRestoredVersionId) || !is.nonEmptyString(nodeUuid)) {
      return;
    }

    const fileNodeUuid = nodeUuid;

    setIsLoading(true);
    try {
      const cellsRepository = container.resolve(CellsRepository);
      await cellsRepository.promoteNodeDraft({
        uuid: fileNodeUuid,
        versionId: toBeRestoredVersionId,
      });
    } catch (err: unknown) {
      const errorMessage = is.error(err) ? err.message : failedToRestore;
      setError(errorMessage);
    } finally {
      reset();
    }
  }, [failedToRestore, nodeUuid, reset, toBeRestoredVersionId]);

  return {
    fileInfo,
    fileVersions,
    isLoading,
    error,
    handleDownload,
    handleRestore,
    setToBeRestoredVersionId,
    toBeRestoredVersionId,
  };
};

const parseOwnerQualifiedId = (ownerUuid?: string): QualifiedId | undefined => {
  if (!is.nonEmptyString(ownerUuid)) {
    return undefined;
  }

  try {
    return parseQualifiedId(ownerUuid.trim());
  } catch (error) {
    logger.warn('Failed to parse qualifiedId', ownerUuid, error);
    return undefined;
  }
};

const getOwnerNamesByUserIdMap = (versions: Partial<RestVersion>[]): Map<string, string> => {
  const ownerIds = new Set(
    versions.flatMap(version => {
      const qualifiedId = parseOwnerQualifiedId(version.OwnerUuid);
      if (is.undefined(qualifiedId)) {
        return [];
      }

      return [qualifiedId.id];
    }),
  );

  if (ownerIds.size === 0) {
    return new Map();
  }

  try {
    const users = container.resolve(UserState).users();
    const matchingUsers = users.filter(user => {
      return ownerIds.has(user.id) && user.name() !== '';
    });

    return new Map<string, string>(matchingUsers.map(user => [user.id, user.name()]));
  } catch (error) {
    logger.warn('Failed to resolve owner names from UserState', {ownerIdsCount: ownerIds.size, error});
    return new Map();
  }
};
