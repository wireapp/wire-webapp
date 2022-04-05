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
import cx from 'classnames';

import {t} from 'Util/LocalizerUtil';
import {formatDuration, DurationUnit} from 'Util/TimeUtil';
import Icon from 'Components/Icon';
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';

import {EphemeralTimings} from '../../ephemeral/EphemeralTimings';
import {showContextMenu} from '../../ui/ContextMenu';
import type {Conversation} from '../../entity/Conversation';
import {container} from 'tsyringe';
import {TeamState} from '../../team/TeamState';

export interface MessageTimerButtonProps {
  conversation: Conversation;
  teamState?: TeamState;
}

export const MessageTimerButton: React.FC<MessageTimerButtonProps> = ({
  conversation,
  teamState = container.resolve(TeamState),
}) => {
  const {messageTimer, hasGlobalMessageTimer} = useKoSubscribableChildren(conversation, [
    'messageTimer',
    'hasGlobalMessageTimer',
  ]);
  const {isSelfDeletingMessagesEnabled, isSelfDeletingMessagesEnforced} = useKoSubscribableChildren(teamState, [
    'isSelfDeletingMessagesEnabled',
    'isSelfDeletingMessagesEnforced',
  ]);
  const hasMessageTimer = !!messageTimer;
  const isTimerDisabled = isSelfDeletingMessagesEnforced || hasGlobalMessageTimer;
  const duration = hasMessageTimer ? formatDuration(messageTimer) : ({} as DurationUnit);

  // Click on ephemeral button
  const onClick = (event: React.MouseEvent<HTMLSpanElement>): void => {
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

    showContextMenu(event, entries, 'message-timer-menu');
  };

  return (
    isSelfDeletingMessagesEnabled && (
      <span
        id="conversation-input-bar-message-timer"
        className="controls-right-button conversation-input-bar-message-timer"
        onClick={isTimerDisabled ? undefined : onClick}
        title={t('tooltipConversationEphemeral')}
        data-uie-value={isTimerDisabled ? 'disabled' : 'enabled'}
        data-uie-name="do-set-ephemeral-timer"
      >
        {hasMessageTimer ? (
          conversation && (
            <div
              className={cx(
                'message-timer-button',
                isTimerDisabled ? 'message-timer-button--disabled' : 'message-timer-button--enabled',
              )}
              data-uie-name="message-timer-button"
            >
              <span className="message-timer-button-unit" data-uie-name="message-timer-button-symbol">
                {duration.symbol}
              </span>
              <span className="full-screen" data-uie-name="message-timer-button-value">
                {duration.value}
              </span>
            </div>
          )
        ) : (
          <span className={cx('button-icon-large', {disabled: isTimerDisabled})}>
            <Icon.Timer data-uie-name="message-timer-icon" />
          </span>
        )}
      </span>
    )
  );
};

export default MessageTimerButton;
registerStaticReactComponent('message-timer-button', MessageTimerButton);
