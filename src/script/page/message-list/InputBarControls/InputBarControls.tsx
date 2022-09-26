/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import Icon from 'Components/Icon';
import cx from 'classnames';
import React from 'react';
import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import ControlButtons, {ControlButtonsProps} from './ControlButtons';

type InputBarControlsProps = ControlButtonsProps & {
  onSend: () => void;
  responsive: Boolean;
};

const InputBarControls: React.FC<InputBarControlsProps> = ({onSend, responsive, ...props}) => {
  return responsive ? (
    <ul className="controls-right buttons-group">
      <li>
        <button
          type="button"
          className={cx('controls-right-button controls-right-button--send')}
          disabled={props.input.length === 0}
          title={t('tooltipConversationSendMessage')}
          aria-label={t('tooltipConversationSendMessage')}
          onClick={onSend}
          data-uie-name="do-send-message"
        >
          <Icon.Send />
        </button>
      </li>
      <ControlButtons {...props} />
    </ul>
  ) : (
    <ul className="controls-right buttons-group">
      <ControlButtons {...props} />

      <li>
        <button
          type="button"
          className={cx('controls-right-button controls-right-button--send')}
          disabled={props.input.length === 0}
          title={t('tooltipConversationSendMessage')}
          aria-label={t('tooltipConversationSendMessage')}
          onClick={onSend}
          data-uie-name="do-send-message"
        >
          <Icon.Send />
        </button>
      </li>
    </ul>
  );
};

export default InputBarControls;

registerReactComponent('input-bar-controls', InputBarControls);
