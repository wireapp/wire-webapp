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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {parseQualifiedId} from '@wireapp/core/lib/util/qualifiedIdUtil';
import {RestVersion} from 'cells-sdk-ts';
import {container} from 'tsyringe';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {UserState} from 'Repositories/user/UserState';
import {t} from 'Util/localizerUtil';
import {forcedDownloadFile, getFileExtension, getName} from 'Util/util';

import {FileInfo, FileVersion} from '../types';
import {groupVersionsByDate} from '../utils/fileVersionUtils';

/**
 * Hook to fetch and manage file versions for a given node UUID.
 */
export const useFileVersions = (nodeUuid?: string, onClose?: () => void, onRestore?: () => void) => {
  const [fileInfo, setFileInfo] = useState<FileInfo>();
  const [fileVersions, setFileVersions] = useState<Record<string, FileVersion[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string>();
  const [toBeRestoredVersionId, setToBeRestoredVersionId] = useState<string>();

  useEffect(() => {
    if (!nodeUuid) {
      setFileInfo(undefined);
      setFileVersions({});
      return;
    }

    const loadFileVersions = async () => {
      setIsLoading(true);
      setError(undefined);
      const cellsRepository = container.resolve(CellsRepository);
      try {
        // Fetch the node details and versions in parallel
        const [node, versions] = await Promise.all([
          cellsRepository.getNode({uuid: nodeUuid}),
          cellsRepository.getNodeVersions({uuid: nodeUuid, flags: ['WithPreSignedURLs']}),
        ]);

        // Validate node data
        if (!node?.Path) {
          throw new Error(t('fileHistoryModal.invalidNodeData'));
        }

        // Extract file info from the node
        const info: FileInfo = {
          name: getName(node.Path),
          extension: getFileExtension(node.Path),
        };

        setFileInfo(info);

        const ownerNameByUserId = getOwnerNameByUserId(versions || []);
        const groupedVersions = groupVersionsByDate(versions || [], version => {
          const ownerQualifiedId = parseOwnerQualifiedId(version.OwnerUuid);
          if (!ownerQualifiedId) {
            return undefined;
          }

          return ownerNameByUserId.get(ownerQualifiedId.id);
        });
        setFileVersions(groupedVersions);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : t('fileHistoryModal.failedToLoadVersions');
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void loadFileVersions();
  }, [nodeUuid]);

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
        await forcedDownloadFile({url, name: fileInfo?.name || 'file'});
      } finally {
        setIsDownloading(false);
      }
    },
    [isDownloading, fileInfo],
  );

  const handleRestore = useCallback(async () => {
    if (!toBeRestoredVersionId || !nodeUuid) {
      return;
    }
    setIsLoading(true);
    try {
      const cellsRepository = container.resolve(CellsRepository);
      await cellsRepository.promoteNodeDraft({
        uuid: nodeUuid,
        versionId: toBeRestoredVersionId,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('fileHistoryModal.failedToRestore');
      setError(errorMessage);
    } finally {
      reset();
    }
  }, [toBeRestoredVersionId, nodeUuid, reset]);

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
  if (!ownerUuid) {
    return undefined;
  }

  try {
    return parseQualifiedId(ownerUuid.trim());
  } catch {
    return undefined;
  }
};

const getOwnerNameByUserId = (versions: Partial<RestVersion>[]): Map<string, string> => {
  const ownerIds = new Set(
    versions.flatMap(version => {
      const qualifiedId = parseOwnerQualifiedId(version.OwnerUuid);
      return qualifiedId ? [qualifiedId.id] : [];
    }),
  );

  if (!ownerIds.size) {
    return new Map();
  }

  try {
    const users = container.resolve(UserState).users();
    const matchingUsers = users.filter(user => ownerIds.has(user.id) && user.name());

    return new Map<string, string>(matchingUsers.map(user => [user.id, user.name()]));
  } catch {
    return new Map();
  }
};
