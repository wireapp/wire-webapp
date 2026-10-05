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

import {useEffect, useCallback} from 'react';

interface UseArrowsNavigationParams {
  currentPage: number;
  pagesCount: number;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

export const useArrowsNavigation = ({
  currentPage,
  pagesCount,
  onNextPage,
  onPreviousPage,
}: UseArrowsNavigationParams) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' && currentPage < pagesCount) {
        onNextPage();
      }

      if (event.key === 'ArrowLeft' && currentPage > 1) {
        onPreviousPage();
      }
    },
    [currentPage, pagesCount, onNextPage, onPreviousPage],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};
