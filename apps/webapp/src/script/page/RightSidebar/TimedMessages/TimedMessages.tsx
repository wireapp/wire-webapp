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

import {FC, useEffect, useState} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {RadioGroup} from 'Components/Radio';
import {Conversation} from 'Repositories/entity/Conversation';
import {TeamState} from 'Repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatDuration} from 'Util/TimeUtil';

import {EphemeralTimings} from '../../../ephemeral/EphemeralTimings';
import {ViewModelRepositories} from '../../../view_model/MainViewModel';
import {PanelHeader} from '../PanelHeader';

interface TimedMessagesPanelProps {
  activeConversation: Conversation;
  onClose: () => void;
  onGoBack: () => void;
  repositories: ViewModelRepositories;
  teamState: TeamState;
}

interface MessageTime {
  isCustom: boolean;
  text: string;
  value: number;
}

const TimedMessages: FC<TimedMessagesPanelProps> = ({
  activeConversation,
  onClose,
  onGoBack,
  repositories,
  teamState,
}) => {
  const [currentMessageTimer, setCurrentMessageTimer] = useState(0);
  const [messageTimes, setMessageTimes] = useState<MessageTime[]>([]);

  const {globalMessageTimer} = useKoSubscribableChildren(activeConversation, ['globalMessageTimer']);
  const {isSelfDeletingMessagesEnforced, getEnforcedSelfDeletingMessagesTimeout} = useKoSubscribableChildren(
    teamState,
    ['isSelfDeletingMessagesEnforced', 'getEnforcedSelfDeletingMessagesTimeout'],
  );

  useEffect(() => {
    const messageTimer = isSelfDeletingMessagesEnforced
      ? getEnforcedSelfDeletingMessagesTimeout
      : (globalMessageTimer ?? 0);
    setCurrentMessageTimer(messageTimer);

    const mappedTimes = EphemeralTimings.VALUES.map(time => ({
      isCustom: false,
      text: formatDuration(time).text,
      value: time,
    }));

    if (!!messageTimer && !EphemeralTimings.VALUES.includes(messageTimer)) {
      mappedTimes.push({
        isCustom: true,
        text: formatDuration(messageTimer).text,
        value: messageTimer,
      });
    }

    mappedTimes.unshift({
      isCustom: false,
      text: t('ephemeralUnitsNone'),
      value: 0,
    });

    setMessageTimes(mappedTimes);
  }, [globalMessageTimer]);

  const timedMessageChange = (value: number): void => {
    const finalTimer = value === 0 ? null : value;

    activeConversation.globalMessageTimer(finalTimer);
    repositories.conversation.updateConversationMessageTimer(activeConversation, finalTimer);
  };

  return (
    <div id="timed-messages" className="panel__page timed-messages">
      <PanelHeader
        onGoBack={onGoBack}
        onClose={onClose}
        title={t('timedMessagesTitle')}
        goBackUie="go-back-timed-messages-options"
      />

      <FadingScrollbar className="panel__content">
        <div css={{margin: '16px'}}>
          <RadioGroup
            ariaLabelledBy={t('timedMessagesTitle')}
            name="timed-message-settings"
            selectedValue={currentMessageTimer}
            onChange={timedMessageChange}
            options={messageTimes.map(({text, isCustom, value}) => ({
              label: text,
              value: value,
              isDisabled: isCustom || isSelfDeletingMessagesEnforced,
              optionUeiName: 'item-timed-messages-option',
            }))}
          />
        </div>
        <p className="panel__info-text timed-messages__disclaimer" tabIndex={TabIndex.FOCUSABLE}>
          {t('timedMessageDisclaimer')}
        </p>
      </FadingScrollbar>
    </div>
  );
};

export {TimedMessages};
