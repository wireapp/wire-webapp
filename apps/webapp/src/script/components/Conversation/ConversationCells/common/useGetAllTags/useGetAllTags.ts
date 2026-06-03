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

import {useEffect} from 'react';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/RootProvider';

import {useAllCellsTagsStore} from '../useAllCellsTagsStore/useAllCellsTagsStore';

export const useGetAllTags = ({cellsRepository}: {cellsRepository: CellsRepository}) => {
  const {fireAndForgetInvoker} = useApplicationContext();
  const tags = useAllCellsTagsStore(state => state.tags);
  const isLoading = useAllCellsTagsStore(state => state.isLoading);
  const error = useAllCellsTagsStore(state => state.error);
  const hasFetched = useAllCellsTagsStore(state => state.hasFetched);
  const fetch = useAllCellsTagsStore(state => state.fetch);

  useEffect(() => {
    if (hasFetched) {
      return;
    }
    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await fetch(cellsRepository);
    });
    // cellsRepository is a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch, fireAndForgetInvoker, hasFetched]);

  return {tags, isLoading, error};
};
