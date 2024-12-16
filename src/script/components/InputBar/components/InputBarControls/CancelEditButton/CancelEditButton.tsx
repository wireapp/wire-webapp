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

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

interface CancelEditButtonProps {
  onClick: () => void;
}

export const CancelEditButton = ({onClick}: CancelEditButtonProps) => {
  return (
    <button
      type="button"
      className="controls-right-button button-icon-large"
      onClick={onClick}
      data-uie-name="do-cancel-edit"
      aria-label={t('accessibility.cancelMsgEdit')}
    >
      <Icon.CloseIcon />
    </button>
  );
};
