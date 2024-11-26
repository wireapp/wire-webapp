/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React from 'react';

import {CSSObject} from '@emotion/react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  currentStart: number;
  visibleDots: number;
  wrapperStyles?: CSSObject;
}

const paginationItemStyles: CSSObject = {
  ':last-child': {
    marginRight: 4,
  },
  borderRadius: '50%',
  marginLeft: 4,
};

const Pagination: React.FC<PaginationProps> = ({
  totalPages,
  currentPage,
  currentStart,
  visibleDots,
  wrapperStyles = {},
}) => {
  const visibleRange = Array.from({length: visibleDots}, (_, index) => currentStart + index);

  return (
    <div
      css={{
        alignItems: 'center',
        borderRadius: 12,
        display: 'flex',
        height: 22,
        justifyContent: 'center',
        ...wrapperStyles,
      }}
      data-uie-name="pagination-wrapper"
    >
      {visibleRange.map((page, index) => {
        const isCurrentPage = currentPage === page;
        const isFirstOrLastInTheRange = index === 0 || index === visibleRange.length - 1;
        const isLastPage = page === totalPages - 1;
        const isFirstPage = page === 0;

        const isSmaller = isFirstOrLastInTheRange && !(isFirstPage || isLastPage);

        return (
          <div
            data-uie-name="pagination-item"
            data-uie-status={isCurrentPage ? 'active' : 'inactive'}
            key={page}
            css={{
              ...paginationItemStyles,
              '&:active': {
                backgroundColor: isCurrentPage ? 'var(--accent-color)' : 'var(--toggle-button-unselected-bg)',
                border: '1px solid var(--accent-color)',
              },
              backgroundColor: isCurrentPage ? 'var(--accent-color)' : 'transparent',
              border: isCurrentPage ? 'solid 1px var(--accent-color)' : 'solid 1px var(--foreground)',
              width: isSmaller ? '8px' : '12px',
              height: isSmaller ? '8px' : '12px',
            }}
          />
        );
      })}
    </div>
  );
};

export {Pagination};
