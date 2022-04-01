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
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {noop} from 'Util/util';
import classNames from 'classnames';
import type {CompositeMessage} from '../../../../../entity/message/CompositeMessage';
import Icon from 'Components/Icon';

export interface MessageButtonProps {
  id: string;
  label: string;
  message: CompositeMessage;
  onClick?: () => void;
}

const MessageButton: React.FC<MessageButtonProps> = ({id, label, message, onClick = noop}) => {
  const {errorButtonId, errorMessage, selectedButtonId, waitingButtonId} = useKoSubscribableChildren(message, [
    'errorButtonId',
    'errorMessage',
    'selectedButtonId',
    'waitingButtonId',
  ]);

  const isSelected = selectedButtonId === id;
  const isWaiting = waitingButtonId === id;
  const hasError = errorButtonId === id;

  return (
    <>
      <button
        className={classNames('message-button', {
          'message-button--selected': isSelected,
        })}
        onClick={onClick}
        data-uie-name={label}
        data-uie-uid={id}
        data-uie-selected={isSelected}
        data-uie-waiting={isWaiting}
      >
        <span>{label}</span>
        <div
          className={classNames('message-button__waiting-overlay', {
            'message-button__waiting-overlay--visible': isWaiting,
          })}
        >
          <Icon.Loading data-uie-name="message-button-loading-icon" />
        </div>
      </button>
      {hasError && errorMessage && (
        <div className="message-button__error" data-uie-name="message-button-error">
          {errorMessage}
        </div>
      )}
    </>
  );
};

export default MessageButton;
