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

import type {FunctionComponent} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';

import type {CompositeMessage} from '../../../../../../repositories/entity/message/compositeMessage';
import {COLOR} from '../../../../../../uiKit/identity/colors/colors';
import {ariaDisabledStyle} from '../../../../../../uiKit/inputs/ariaDisabled.styles';
import {Button, ButtonVariant} from '../../../../../../uiKit/inputs/button/button';
import {useKoSubscribableChildren} from '../../../../../../util/componentUtil';
import {noop} from '../../../../../../util/util';

interface MessageButtonProps {
  id: string;
  label: string;
  message: CompositeMessage;
  onClick?: () => void;
  /**
   * Given while offline: the button stays focusable but does nothing, and takes this as its accessible name. A prop,
   * because importing the app context here would close an import cycle.
   */
  getOfflineLabel?: (label: string) => string;
}

export const MessageButton: FunctionComponent<MessageButtonProps> = ({
  id,
  label,
  message,
  onClick = noop,
  getOfflineLabel,
}: MessageButtonProps) => {
  const {errorButtonId, errorMessage, selectedButtonId, waitingButtonId} = useKoSubscribableChildren(message, [
    'errorButtonId',
    'errorMessage',
    'selectedButtonId',
    'waitingButtonId',
  ]);

  const offlineLabel = getOfflineLabel?.(label);
  const isOffline = offlineLabel !== undefined;

  const isSelected = selectedButtonId === id;
  const isWaiting = waitingButtonId === id;
  const hasError = errorButtonId === id;

  return (
    <>
      <Button
        variant={ButtonVariant.SECONDARY}
        onClick={isOffline ? noop : onClick}
        aria-disabled={isOffline || undefined}
        aria-label={offlineLabel}
        title={offlineLabel}
        data-uie-name={label}
        data-uie-uid={id}
        data-uie-selected={isSelected}
        data-uie-waiting={isWaiting}
        showLoading={isWaiting}
        isActive={isSelected}
        loadingColor={COLOR.GRAY}
        css={ariaDisabledStyle}
        style={{
          maxWidth: '400px',
          width: '100%',
          marginTop: '8px',
          marginBottom: 0,
        }}
      >
        {label}
      </Button>

      {hasError &&
        (isNonEmptyString(errorMessage) ? (
          <div className="message-button__error" data-uie-name="message-button-error">
            {errorMessage}
          </div>
        ) : (
          errorMessage
        ))}
    </>
  );
};
