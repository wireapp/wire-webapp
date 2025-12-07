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
import {t} from 'Util/LocalizerUtil';

import {dotStyles, dotButtonStyles} from './Pagination.styles';

interface PaginationDotProps {
  page: number;
  isCurrentPage: boolean;
  isSmaller: boolean;
  onClick: (page: number) => void;
}

export const PaginationDot = ({page, isCurrentPage, isSmaller, onClick}: PaginationDotProps) => {
  return (
    <button
      className="icon-button"
      css={dotButtonStyles(isSmaller)}
      onClick={() => onClick(page)}
      onKeyDown={event =>
        handleKeyDown({
          event,
          callback: () => onClick(page),
          keys: [KEY.ENTER, KEY.SPACE],
        })
      }
      aria-label={t('paginationDotAriaLabel', {page: page + 1})}
      aria-current={isCurrentPage ? 'page' : undefined}
      data-page={page}
      data-uie-name="pagination-item"
      data-uie-status={isCurrentPage ? 'active' : 'inactive'}
    >
      <div css={dotStyles(isCurrentPage, isSmaller)} />
    </button>
  );
};
