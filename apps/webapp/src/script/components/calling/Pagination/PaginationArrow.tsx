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

import {ChevronIcon, IconButton, IconButtonVariant} from '@wireapp/react-ui-kit';

import {chevronLeftStyles, chevronRightStyles, iconButtonStyles} from './Pagination.styles';

interface PaginationArrowProps {
  onClick: () => void;
  disabled?: boolean;
  direction: 'left' | 'right';
  'data-uie-name': string;
}

export const PaginationArrow = ({onClick, disabled, direction, 'data-uie-name': uieName}: PaginationArrowProps) => {
  const ariaLabel = direction === 'left' ? t('paginationLeftArrowAriaLabel') : t('paginationRightArrowAriaLabel');

  return (
    <IconButton
      variant={IconButtonVariant.SECONDARY}
      css={iconButtonStyles}
      onClick={onClick}
      onKeyDown={event =>
        handleKeyDown({
          event,
          callback: onClick,
          keys: [KEY.ENTER, KEY.SPACE],
        })
      }
      disabled={disabled}
      data-uie-name={uieName}
      type="button"
      aria-label={ariaLabel}
    >
      <ChevronIcon css={direction === 'left' ? chevronLeftStyles : chevronRightStyles} aria-hidden="true" />
    </IconButton>
  );
};
