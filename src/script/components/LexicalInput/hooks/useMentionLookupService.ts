/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {useCallback, useEffect, useMemo, useState} from 'react';

import {User} from '../../../entity/User';

export function useMentionLookupService(
  queryString: string | null,
  trigger: string | null,
  items?: Record<string, User[]>,
  onSearch?: (trigger: string, queryString?: string | null) => User[],
) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<User[]>([]);

  const lookupService = useCallback(
    async (queryString: string | null, trigger: string) => {
      const mentions =
        items &&
        Object.entries(items).find(([key]) => {
          return new RegExp(key).test(trigger);
        });

      if (mentions) {
        return !queryString
          ? [...mentions[1]]
          : mentions[1].filter(item => item.name().toLowerCase().includes(queryString.toLowerCase()));
      }

      if (onSearch) {
        setLoading(true);
        return onSearch(trigger, queryString);
      }

      throw new Error('No lookup service provided');
    },
    [items, onSearch],
  );

  useEffect(() => {
    if (trigger === null || queryString === null) {
      setResults([]);
      return;
    }

    void lookupService(queryString, trigger).then(res => setResults(res));
  }, [queryString, lookupService, trigger]);

  return useMemo(() => ({loading, results}), [loading, results]);
}
