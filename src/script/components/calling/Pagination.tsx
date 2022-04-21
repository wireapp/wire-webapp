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

const Pagination: React.FC<PaginationProps> = ({totalPages, currentPage, onChangePage, wrapperStyles = {}}) => {
  const pages = new Array(totalPages).fill(null).map((_, index) => index);

  return (
    <div
      css={{
        alignItems: 'center',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.24)',
        borderRadius: 12,
        display: 'flex',
        height: 16,
        justifyContent: 'center',
        ...wrapperStyles,
      }}
      data-uie-name="pagination-wrapper"
    >
      {pages.map(page => (
        <button
          data-uie-name="pagination-item"
          data-uie-status={currentPage === page ? 'active' : 'inactive'}
          key={page}
          onClick={() => onChangePage(page)}
          type="button"
          className="button-reset-default"
          css={{
            ':last-child': {
              marginRight: 4,
            },
            backgroundColor: currentPage === page ? '#ffffff' : 'initial',
            border: 'solid 1px #ffffff',
            borderRadius: 8,
            cursor: 'pointer',
            height: 8,
            marginLeft: 4,
            width: 8,
          }}
        />
      ))}
    </div>
  );
};

export default Pagination;
