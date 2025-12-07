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

import {forwardRef, RefObject} from 'react';

import {useVirtualizer} from '@tanstack/react-virtual';

import {PdfPageThumbnail} from './PdfPageThumbnail/PdfPageThumbnail';
import {listItemStyles, listStyles, wrapperStyles} from './PdfSidebar.styles';
import {useArrowsNavigation} from './useArrowsNavigation/useArrowsNavigation';

interface PdfSidebarProps {
  sidebarOpen: boolean;
  pagesCount: number;
  currentPage: number;
  onPageChange: (pageNumber: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

const THUMBNAIL_SIZE = 160;
const OVERSCAN = 5;

export const PdfSidebar = forwardRef<HTMLDivElement, PdfSidebarProps>(
  ({sidebarOpen, pagesCount, currentPage, onPageChange, onNextPage, onPreviousPage}, ref) => {
    const rowVirtualizer = useVirtualizer({
      count: pagesCount,
      getScrollElement: () => (ref as RefObject<HTMLDivElement>).current,
      estimateSize: () => THUMBNAIL_SIZE,
      overscan: OVERSCAN,
    });

    useArrowsNavigation({
      currentPage,
      pagesCount,
      onNextPage,
      onPreviousPage,
    });

    return (
      <div ref={ref} css={wrapperStyles(sidebarOpen)}>
        <ul
          css={listStyles}
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualItem => {
            const pageNumber = virtualItem.index + 1;

            return (
              <li
                key={virtualItem.key}
                css={listItemStyles}
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <PdfPageThumbnail
                  index={virtualItem.index}
                  sidebarOpen={sidebarOpen}
                  pageNumber={pageNumber}
                  isActive={pageNumber === currentPage}
                  onClick={() => onPageChange(pageNumber)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    );
  },
);

PdfSidebar.displayName = 'PdfSidebar';
