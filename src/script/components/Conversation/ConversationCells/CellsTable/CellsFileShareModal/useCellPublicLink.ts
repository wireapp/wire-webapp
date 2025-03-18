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

import {useCellsStore} from '../../common/useCellsStore/useCellsStore';

interface UseCellPublicLinkParams {
  uuid: string;
  cellsRepository: CellsRepository;
}

type PublicLinkStatus = 'idle' | 'loading' | 'error' | 'success';

export const useCellPublicLink = ({uuid, cellsRepository}: UseCellPublicLinkParams) => {
  const {files, updateFile} = useCellsStore();
  const file = files.find(f => f.id === uuid);
  const [isEnabled, setIsEnabled] = useState(!!file?.publicLink);
  const [status, setStatus] = useState<PublicLinkStatus>(file?.publicLink ? 'success' : 'idle');

  const getPublicLink = useCallback(async () => {
    try {
      setStatus('loading');
      const link = await cellsRepository.createPublicLink({uuid, label: file?.name || ''});

      if (!link.LinkUrl || !link.Uuid) {
        throw new Error('No link found');
      }

      const newLink = {uuid: link.Uuid, url: Config.getConfig().CELLS_PYDIO_URL + link.LinkUrl};
      updateFile(uuid, {publicLink: newLink});
      setStatus('success');
    } catch (err) {
      setStatus('error');
      updateFile(uuid, {publicLink: undefined});
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, updateFile]);

  const deletePublicLink = useCallback(async () => {
    if (!file?.publicLink) {
      return;
    }

    try {
      await cellsRepository.deletePublicLink({uuid: file.publicLink.uuid});
      updateFile(uuid, {publicLink: undefined});
    } catch (err) {
      setStatus('error');
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, file?.publicLink, updateFile]);

  const togglePublicLink = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    if (!isEnabled && file?.publicLink) {
      void deletePublicLink();
      return;
    }

    if (isEnabled && !file?.publicLink) {
      void getPublicLink();
    }
  }, [isEnabled, getPublicLink, deletePublicLink, file?.publicLink]);

  return {
    status,
    link: file?.publicLink?.url,
    isEnabled,
    togglePublicLink,
  };
};
