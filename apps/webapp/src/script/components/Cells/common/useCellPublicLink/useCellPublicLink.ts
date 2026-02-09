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

import {useCallback, useEffect, useRef, useState} from 'react';

import type {RestShareLink} from '@wireapp/api-client/lib/cells';

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {Config} from 'src/script/Config';
import type {CellNode} from 'src/script/types/cellNode';

type PublicLinkStatus = 'idle' | 'loading' | 'error' | 'success';

interface UseCellPublicLinkParams {
  uuid: string;
  node?: CellNode;
  cellsRepository: CellsRepository;
  setPublicLink: (data: CellNode['publicLink'] | undefined) => void;
  refreshLinkDataAfterUpdate?: boolean;
  setStatusOnPublicLinkUrl?: boolean;
  includeNodePublicLinkInCallbacks?: boolean;
}

export const useCellPublicLink = ({
  uuid,
  node,
  cellsRepository,
  setPublicLink,
  refreshLinkDataAfterUpdate = false,
  setStatusOnPublicLinkUrl = false,
  includeNodePublicLinkInCallbacks = false,
}: UseCellPublicLinkParams) => {
  const [isEnabled, setIsEnabled] = useState(!!node?.publicLink?.alreadyShared || false);
  const [status, setStatus] = useState<PublicLinkStatus>(node?.publicLink ? 'success' : 'idle');
  const [linkData, setLinkData] = useState<RestShareLink | null>(null);
  const fetchedLinkId = useRef<string | null>(null);
  // Track created link UUID to handle immediate disable scenario
  const createdLinkUuid = useRef<string | null>(null);

  const createPublicLink = useCallback(async () => {
    try {
      setStatus('loading');
      const link = await cellsRepository.createPublicLink({
        uuid,
        link: {
          Label: node?.name || '',
          Permissions: ['Preview', 'Download'],
        },
      });

      if (!link.LinkUrl || !link.Uuid) {
        throw new Error('Link not found');
      }

      const newLink = {uuid: link.Uuid, url: Config.getConfig().CELLS_PYDIO_URL + link.LinkUrl, alreadyShared: true};
      // Store the created link UUID for immediate deletion scenario
      createdLinkUuid.current = link.Uuid;
      setPublicLink(newLink);
      setLinkData(link);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setPublicLink(undefined);
      createdLinkUuid.current = null;
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, setPublicLink]);

  const getPublicLink = useCallback(async () => {
    const linkId = node?.publicLink?.uuid;

    if (!linkId || fetchedLinkId.current === linkId) {
      return;
    }

    try {
      setStatus('loading');

      const link = await cellsRepository.getPublicLink({uuid: linkId});

      if (!link.LinkUrl || !link.Uuid) {
        throw new Error('Link not found');
      }

      const newLink = {uuid: link.Uuid, url: Config.getConfig().CELLS_PYDIO_URL + link.LinkUrl, alreadyShared: true};

      setPublicLink(newLink);
      setLinkData(link);
      fetchedLinkId.current = linkId;
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setPublicLink(undefined);
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    uuid,
    setPublicLink,
    includeNodePublicLinkInCallbacks ? node?.publicLink : undefined,
    includeNodePublicLinkInCallbacks,
  ]);

  const deletePublicLink = useCallback(async () => {
    const linkUuid = createdLinkUuid.current || node?.publicLink?.uuid;

    if (!linkUuid) {
      return;
    }

    try {
      await cellsRepository.deletePublicLink({uuid: linkUuid});
      setPublicLink(undefined);
      createdLinkUuid.current = null; // Clear after successful deletion
    } catch (err) {
      setStatus('error');
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    uuid,
    setPublicLink,
    includeNodePublicLinkInCallbacks ? node?.publicLink : undefined,
    includeNodePublicLinkInCallbacks,
  ]);

  const updatePublicLink = useCallback(
    async ({
      password,
      passwordEnabled,
      accessEnd,
    }: {
      password?: string;
      passwordEnabled?: boolean;
      accessEnd?: string | null;
    }) => {
      if (!node?.publicLink?.uuid) {
        throw new Error('No public link to update');
      }

      try {
        setStatus('loading');

        const currentLink = await cellsRepository.getPublicLink({uuid: node.publicLink.uuid});

        const hasExistingPassword = currentLink.PasswordRequired === true;
        const isSettingPassword = passwordEnabled && password;

        const updatedLink: typeof currentLink = {
          ...currentLink,
          PasswordRequired: passwordEnabled,
        };

        if (accessEnd === null) {
          // Ensure that accessEnd is not present in JSON
          delete updatedLink.AccessEnd;
        } else if (accessEnd !== undefined) {
          updatedLink.AccessEnd = accessEnd;
        }

        await cellsRepository.updatePublicLink({
          linkUuid: node.publicLink.uuid,
          link: updatedLink,
          // Use createPassword if no password exists, updatePassword if it does
          ...(isSettingPassword ? (hasExistingPassword ? {updatePassword: password} : {createPassword: password}) : {}),
          passwordEnabled,
        });

        // Update linkData with the new values so the UI doesn't reset
        setLinkData(prevData => {
          if (!prevData) {
            return prevData;
          }
          return {
            ...prevData,
            PasswordRequired: passwordEnabled,
            AccessEnd: accessEnd === null ? undefined : accessEnd !== undefined ? accessEnd : prevData.AccessEnd,
          };
        });

        if (refreshLinkDataAfterUpdate) {
          const refreshedLink = await cellsRepository.getPublicLink({uuid: node.publicLink.uuid});
          setLinkData(refreshedLink);
        }

        setStatus('success');
      } catch (err) {
        setStatus('error');
        throw err;
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node?.publicLink?.uuid, refreshLinkDataAfterUpdate],
  );

  const togglePublicLink = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    const shouldDeleteLink = !isEnabled && node?.publicLink?.url;
    const shouldCreateNewLink = isEnabled && !node?.publicLink?.alreadyShared;
    const shouldGetLink = isEnabled && node?.publicLink?.alreadyShared;

    if (shouldGetLink) {
      void getPublicLink();
      return;
    }

    if (shouldDeleteLink) {
      void deletePublicLink();
      return;
    }

    if (shouldCreateNewLink) {
      void createPublicLink();
    }
  }, [isEnabled, node?.publicLink, createPublicLink, deletePublicLink, getPublicLink]);

  useEffect(() => {
    if (!setStatusOnPublicLinkUrl) {
      return;
    }

    if (node?.publicLink?.url) {
      setStatus('success');
    }
  }, [node?.publicLink?.url, setStatusOnPublicLinkUrl]);

  return {
    status,
    link: node?.publicLink?.url,
    linkData,
    isEnabled,
    togglePublicLink,
    updatePublicLink,
  };
};
