/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import cx from 'classnames';

import {Icon} from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

interface SendMessageButtonProps {
  disabled?: boolean;
  onSend: () => void;
}

export const SendMessageButton = ({disabled, onSend}: SendMessageButtonProps) => {
  return (
    <button
      type="button"
      className={cx('controls-right-button controls-right-button--send')}
      disabled={disabled}
      title={t('tooltipConversationSendMessage')}
      aria-label={t('tooltipConversationSendMessage')}
      data-uie-name="do-send-message"
      onClick={onSend}
    >
      <Icon.Send />
    </button>
  );
};
