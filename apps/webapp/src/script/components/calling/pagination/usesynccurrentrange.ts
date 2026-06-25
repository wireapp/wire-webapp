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

import {useEffect} from 'react';

type SyncCurrentRange = {
  currentPage: number;
  currentStart: number;
  setCurrentStart: (currentStart: number) => void;
  totalPages: number;
  visibleDots: number;
};

export const useSyncCurrentRange = ({
  currentPage,
  currentStart,
  totalPages,
  setCurrentStart,
  visibleDots,
}: SyncCurrentRange) => {
  useEffect(() => {
    if (visibleDots > totalPages) {
      return;
    }

    const isLastInTheRange = currentPage === currentStart + visibleDots - 1;
    const isLastPage = currentPage === totalPages - 1;

    if (isLastInTheRange && !isLastPage) {
      setCurrentStart(currentStart + 1);
      return;
    }

    if (currentStart + visibleDots - 1 >= totalPages && currentStart > 0) {
      setCurrentStart(currentStart - 1);
    }
  }, [totalPages, setCurrentStart, currentStart, currentPage, visibleDots]);
};
