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

import {Button, ButtonVariant, COLOR} from '@wireapp/react-ui-kit';

import type {CompositeMessage} from 'Repositories/entity/message/CompositeMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {noop} from 'Util/util';

export interface MessageButtonProps {
  id: string;
  label: string;
  message: CompositeMessage;
  onClick?: () => void;
}

export const MessageButton = ({id, label, message, onClick = noop}: MessageButtonProps) => {
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
      <Button
        variant={ButtonVariant.SECONDARY}
        onClick={onClick}
        data-uie-name={label}
        data-uie-uid={id}
        data-uie-selected={isSelected}
        data-uie-waiting={isWaiting}
        showLoading={isWaiting}
        isActive={isSelected}
        loadingColor={COLOR.GRAY}
        style={{maxWidth: '400px', width: '100%', marginTop: '8px', marginBottom: 0}}
      >
        {label}
      </Button>

      {hasError && errorMessage && (
        <div className="message-button__error" data-uie-name="message-button-error">
          {errorMessage}
        </div>
      )}
    </>
  );
};
