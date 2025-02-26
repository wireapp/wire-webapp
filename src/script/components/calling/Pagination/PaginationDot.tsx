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

import {handleKeyDown, KEY} from 'Util/KeyboardUtil';

import {dotStyles, dotWrapperStyles} from './Pagination.styles';

interface PaginationDotProps {
  page: number;
  isCurrentPage: boolean;
  isSmaller: boolean;
  onClick: (page: number) => void;
}

export function PaginationDot({page, isCurrentPage, isSmaller, onClick}: PaginationDotProps) {
  return (
    <div
      key={page}
      css={dotWrapperStyles(isSmaller)}
      onClick={() => onClick(page)}
      onKeyDown={event =>
        handleKeyDown({
          event,
          callback: () => onClick(page),
          keys: [KEY.ENTER, KEY.SPACE],
        })
      }
      role="button"
      tabIndex={0}
    >
      <div
        data-uie-name="pagination-item"
        data-uie-status={isCurrentPage ? 'active' : 'inactive'}
        css={dotStyles(isCurrentPage, isSmaller)}
      />
    </div>
  );
}
