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

import {useRef, useState, useCallback, type RefObject, type Dispatch, type SetStateAction} from 'react';

type UsePageControlsResult = {
  currentPage: number;
  thumbnailsRef: RefObject<HTMLDivElement | null>;
  handleNextPage: () => void;
  handlePreviousPage: () => void;
  handlePageChange: Dispatch<SetStateAction<number>>;
};
export const usePageControls = (): UsePageControlsResult => {
  const [currentPage, setCurrentPage] = useState(1);

  const thumbnailsRef = useRef<HTMLDivElement | null>(null);

  const scrollToThumbnail = useCallback((pageNumber: number) => {
    const activeThumbnail = thumbnailsRef.current?.querySelector(`[data-page="${pageNumber}"]`);
    activeThumbnail?.scrollIntoView({block: 'end'});
  }, []);

  return {
    currentPage,
    thumbnailsRef,
    handleNextPage: () => {
      setCurrentPage(prev => {
        return prev + 1;
      });
      scrollToThumbnail(currentPage + 1);
    },
    handlePreviousPage: () => {
      setCurrentPage(prev => {
        return prev - 1;
      });
      scrollToThumbnail(currentPage - 1);
    },
    handlePageChange: setCurrentPage,
  };
};
