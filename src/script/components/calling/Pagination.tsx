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
  onChangePage: (newPage: number) => void;
  totalPages: number;
  wrapperStyles?: CSSObject;
}

const paginationItemStyles: CSSObject = {
  ':last-child': {
    marginRight: 4,
  },
  borderRadius: '50%',
  cursor: 'pointer',
  height: 12,
  marginLeft: 4,
  width: 12,
};

const Pagination: React.FC<PaginationProps> = ({totalPages, currentPage, onChangePage, wrapperStyles = {}}) => {
  const pages = new Array(totalPages).fill(null).map((_, index) => index);

  return (
    <div
      css={{
        alignItems: 'center',
        backgroundColor: 'var(--border-color)',
        borderRadius: 12,
        display: 'flex',
        height: 22,
        justifyContent: 'center',
        ...wrapperStyles,
      }}
      data-uie-name="pagination-wrapper"
    >
      {pages.map(page => {
        const isCurrentPage = currentPage === page;

        return (
          <button
            data-uie-name="pagination-item"
            data-uie-status={isCurrentPage ? 'active' : 'inactive'}
            key={page}
            onClick={() => onChangePage(page)}
            type="button"
            className="button-reset-default"
            css={{
              ...paginationItemStyles,
              '&:focus-visible': {
                backgroundColor: isCurrentPage
                  ? 'var(--toggle-button-hover-bg)'
                  : 'var(--toggle-button-unselected-hover-bg)',
                border: '1px solid var(--accent-color)',
                outline: 'none',
              },
              '&:hover': {
                backgroundColor: isCurrentPage
                  ? 'var(--toggle-button-hover-bg)'
                  : 'var(--toggle-button-unselected-hover-bg)',
                border: isCurrentPage
                  ? '1px solid var(--toggle-button-hover-bg)'
                  : '1px solid var(--toggle-button-unselected-hover-border)',
              },

              '&:active': {
                backgroundColor: isCurrentPage ? 'var(--accent-color)' : 'var(--toggle-button-unselected-bg)',
                border: '1px solid var(--accent-color)',
              },
              backgroundColor: isCurrentPage ? 'var(--accent-color)' : 'var(--app-bg-secondary)',
              border: isCurrentPage ? 'solid 1px var(--accent-color)' : 'solid 1px var(--foreground)',
            }}
          />
        );
      })}
    </div>
  );
};

export {Pagination};
