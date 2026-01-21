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

import {useCellsStore} from '../../../common/useCellsStore/useCellsStore';

interface UseCellPublicLinkParams {
  uuid: string;
  conversationId: string;
  cellsRepository: CellsRepository;
}

type PublicLinkStatus = 'idle' | 'loading' | 'error' | 'success';

export const useCellPublicLink = ({uuid, conversationId, cellsRepository}: UseCellPublicLinkParams) => {
  const {getNodes, setPublicLink} = useCellsStore();
  const nodes = getNodes({conversationId});
  const node = nodes.find(n => n.id === uuid);
  const [isEnabled, setIsEnabled] = useState(!!node?.publicLink?.alreadyShared || false);
  const [status, setStatus] = useState<PublicLinkStatus>(node?.publicLink ? 'success' : 'idle');
  const [linkData, setLinkData] = useState<RestShareLink | null>(null);
  const fetchedLinkId = useRef<string | null>(null);

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
      setPublicLink({conversationId, nodeId: uuid, data: newLink});
      setLinkData(link);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setPublicLink({conversationId, nodeId: uuid, data: undefined});
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, conversationId, setPublicLink]);

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

      setPublicLink({conversationId, nodeId: uuid, data: newLink});
      setLinkData(link);
      fetchedLinkId.current = linkId;
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setPublicLink({conversationId, nodeId: uuid, data: undefined});
    }
    // cellsRepository is not a dependency because it's a singleton
    // node?.publicLink is intentionally not a dependency to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, conversationId, setPublicLink]);

  const deletePublicLink = useCallback(async () => {
    if (!node?.publicLink || !node.publicLink.uuid) {
      return;
    }

    try {
      await cellsRepository.deletePublicLink({uuid: node.publicLink.uuid});
      setPublicLink({conversationId, nodeId: uuid, data: undefined});
    } catch (err) {
      setStatus('error');
    }
    // cellsRepository is not a dependency because it's a singleton
    // node?.publicLink is intentionally not a dependency to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, conversationId, setPublicLink]);

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
          ...(isSettingPassword ? (hasExistingPassword ? {updatePassword: password} : {createPassword: password}) : {}),
          passwordEnabled,
        });

        setStatus('success');
      } catch (err) {
        setStatus('error');
        throw err;
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node?.publicLink?.uuid],
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

  return {
    status,
    link: node?.publicLink?.url,
    linkData,
    isEnabled,
    togglePublicLink,
    updatePublicLink,
  };
};
