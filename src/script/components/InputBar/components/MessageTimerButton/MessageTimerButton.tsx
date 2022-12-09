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
import {container} from 'tsyringe';

import {Icon} from 'Components/Icon';
import {Conversation} from 'src/script/entity/Conversation';
import {EphemeralTimings} from 'src/script/ephemeral/EphemeralTimings';
import {TeamState} from 'src/script/team/TeamState';
import {showContextMenu} from 'src/script/ui/ContextMenu';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {DurationUnit, formatDuration} from 'Util/TimeUtil';
import {setContextMenuPosition} from 'Util/util';

export interface MessageTimerButtonProps {
  conversation: Conversation;
  teamState?: TeamState;
}

const MessageTimerButton: React.FC<MessageTimerButtonProps> = ({
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

  const setEntries = () =>
    [
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

  // Click on ephemeral button
  const onClick = (event: React.MouseEvent<HTMLSpanElement>): void => {
    const entries = setEntries();
    showContextMenu(event, entries, 'message-timer-menu');
  };

  if (!isSelfDeletingMessagesEnabled) {
    return null;
  }

  const handleContextKeyDown = (event: React.KeyboardEvent) => {
    if ([KEY.SPACE, KEY.ENTER].includes(event.key)) {
      const newEvent = setContextMenuPosition(event);
      const entries = setEntries();
      showContextMenu(newEvent, entries, 'message-timer-menu');
    }
  };

  return (
    <button
      id="conversation-input-bar-message-timer"
      className="controls-right-button buttons-group-button-right conversation-input-bar-message-timer"
      onClick={isTimerDisabled ? undefined : onClick}
      onKeyDown={handleContextKeyDown}
      title={t('tooltipConversationEphemeral')}
      data-uie-value={isTimerDisabled ? 'disabled' : 'enabled'}
      data-uie-name="do-set-ephemeral-timer"
      type="button"
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
        <span className={cx({disabled: isTimerDisabled})} css={{display: 'flex'}}>
          <Icon.Timer data-uie-name="message-timer-icon" />
        </span>
      )}
    </button>
  );
};

export {MessageTimerButton};
