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

import {CellsRepository} from 'src/script/cells/CellsRepository';
import {Config} from 'src/script/Config';

import {useCellsStore} from '../../../common/useCellsStore/useCellsStore';

interface UseCellPublicLinkParams {
  uuid: string;
  conversationId: string;
  cellsRepository: CellsRepository;
}

type PublicLinkStatus = 'idle' | 'loading' | 'error' | 'success';

export const useCellPublicLink = ({uuid, conversationId, cellsRepository}: UseCellPublicLinkParams) => {
  const {getFiles, setPublicLink} = useCellsStore();
  const files = getFiles({conversationId});
  const file = files.find(file => file.id === uuid);
  const [isEnabled, setIsEnabled] = useState(!!file?.publicLink);
  const [status, setStatus] = useState<PublicLinkStatus>(file?.publicLink ? 'success' : 'idle');

  const createPublicLink = useCallback(async () => {
    try {
      setStatus('loading');
      const link = await cellsRepository.createPublicLink({uuid, label: file?.name || ''});

      if (!link.LinkUrl || !link.Uuid) {
        throw new Error('Link not found');
      }

      const newLink = {uuid: link.Uuid, url: Config.getConfig().CELLS_PYDIO_URL + link.LinkUrl, alreadyShared: true};
      setPublicLink({conversationId, fileId: uuid, data: newLink});
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setPublicLink({conversationId, fileId: uuid, data: undefined});
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, conversationId, setPublicLink]);

  const getPublicLink = useCallback(async () => {
    const linkId = file?.publicLink?.uuid;
    const linkUrl = file?.publicLink?.url;

    if (!linkId || linkUrl) {
      return;
    }

    try {
      setStatus('loading');

      const link = await cellsRepository.getPublicLink({uuid: linkId});

      if (!link.LinkUrl || !link.Uuid) {
        throw new Error('Link not found');
      }

      const newLink = {uuid: link.Uuid, url: Config.getConfig().CELLS_PYDIO_URL + link.LinkUrl, alreadyShared: true};

      setPublicLink({conversationId, fileId: uuid, data: newLink});
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setPublicLink({conversationId, fileId: uuid, data: undefined});
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, conversationId, setPublicLink, file?.publicLink]);

  const deletePublicLink = useCallback(async () => {
    if (!file?.publicLink || !file.publicLink.uuid) {
      return;
    }

    try {
      await cellsRepository.deletePublicLink({uuid: file.publicLink.uuid});
      setPublicLink({conversationId, fileId: uuid, data: undefined});
    } catch (err) {
      setStatus('error');
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, conversationId, file?.publicLink, setPublicLink]);

  const togglePublicLink = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    const shouldDeleteLink = !isEnabled && file?.publicLink;
    const shouldCreateNewLink = isEnabled && !file?.publicLink?.alreadyShared;
    const shouldGetLink = isEnabled && file?.publicLink?.alreadyShared;

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
  }, [isEnabled, file?.publicLink, createPublicLink, deletePublicLink, getPublicLink]);

  return {
    status,
    link: file?.publicLink?.url,
    isEnabled,
    togglePublicLink,
  };
};
