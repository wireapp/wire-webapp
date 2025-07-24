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

import {CellsRepository} from 'Repositories/cells/CellsRepository';

export const useGetAllTags = ({
  cellsRepository,
  enabled,
  onSuccess,
}: {
  cellsRepository: CellsRepository;
  enabled: boolean;
  onSuccess: (tags: string[]) => void;
}) => {
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const tags = await cellsRepository.getAllTags();
      const filteredTags = tags.Values?.map(tag => tag).filter(Boolean) ?? [];
      setTags(filteredTags);
      onSuccess(filteredTags);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSuccess]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void fetchTags();
  }, [enabled, fetchTags]);

  return {tags, isLoading, error};
};
