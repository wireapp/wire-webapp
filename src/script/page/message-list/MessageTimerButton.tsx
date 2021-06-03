/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {t} from 'Util/LocalizerUtil';
import {formatDuration, DurationUnit} from 'Util/TimeUtil';
import Icon from 'Components/Icon';
import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';

import {EphemeralTimings} from '../../ephemeral/EphemeralTimings';
import {Context} from '../../ui/ContextMenu';
import type {Conversation} from '../../entity/Conversation';

export interface MessageTimerButtonProps {
  conversation: Conversation;
}

export const MessageTimerButton: React.FC<MessageTimerButtonProps> = ({conversation}) => {
  const messageTimer = useKoSubscribable(conversation.messageTimer);
  const hasMessageTimer = messageTimer || false;
  const isTimerDisabled = useKoSubscribable(conversation.hasGlobalMessageTimer);
  const duration = hasMessageTimer ? formatDuration(messageTimer) : ({} as DurationUnit);

  // Click on ephemeral button
  const onClick = (event: React.MouseEvent<HTMLSpanElement>): void => {
    if (isTimerDisabled) {
      return event.preventDefault();
    }

    const entries = [
      {
        click: () => conversation.localMessageTimer(0),
        label: t('ephemeralUnitsNone'),
      },
    ].concat(
      EphemeralTimings.VALUES.map(milliseconds => {
        const {text} = formatDuration(milliseconds);

        return {
          click: () => conversation.localMessageTimer(milliseconds),
          label: text,
        };
      }),
    );

    Context.from(event, entries, 'message-timer-menu');
  };

  return (
    <span
      id="conversation-input-bar-message-timer"
      className="controls-right-button conversation-input-bar-message-timer"
      onClick={onClick}
      title={t('tooltipConversationEphemeral')}
      data-uie-value={isTimerDisabled ? 'disabled' : 'enabled'}
      data-uie-name="do-set-ephemeral-timer"
    >
      {hasMessageTimer ? (
        conversation && (
          <div className={`message-timer-button message-timer-button--${isTimerDisabled ? 'disabled' : 'enabled'}`}>
            <span className="message-timer-button-unit">{duration.symbol}</span>
            <span className="full-screen">{duration.value}</span>
          </div>
        )
      ) : (
        <div className="button-icon-large">
          <Icon.Timer data-uie-name="message-timer-icon" />
        </div>
      )}
    </span>
  );
};

export default MessageTimerButton;

registerReactComponent('message-timer-button', {
  bindings: 'conversation: ko.unwrap(conversation)',
  component: MessageTimerButton,
});
