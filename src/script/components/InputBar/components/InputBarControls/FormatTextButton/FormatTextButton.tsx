/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import type {MouseEvent} from 'react';

import cx from 'classnames';

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

interface FormatTextButtonProps {
  isScaledDown: boolean;
  isActive: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

export const FormatTextButton = ({isScaledDown, isActive, onClick}: FormatTextButtonProps) => {
  return (
    <button
      className={cx(`controls-right-button buttons-group-button-left`, {
        active: isActive,
        'controls-right-button_responsive': isScaledDown,
      })}
      type="button"
      onClick={onClick}
      title={isActive ? t('tooltipConversationHideFormatting') : t('tooltipConversationShowFormatting')}
      aria-label={isActive ? t('tooltipConversationHideFormatting') : t('tooltipConversationShowFormatting')}
      data-uie-name="format-text"
    >
      <Icon.MarkdownIcon />
    </button>
  );
};
