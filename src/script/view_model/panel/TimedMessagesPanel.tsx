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

import React, {useEffect, useState} from 'react';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';
import {container} from 'tsyringe';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatDuration} from 'Util/TimeUtil';
import useEffectRef from 'Util/useEffectRef';

import {ConversationState} from '../../conversation/ConversationState';
import {EphemeralTimings} from '../../ephemeral/EphemeralTimings';
import {ViewModelRepositories} from '../MainViewModel';
import PanelHeader from './PanelHeader';

interface TimedMessagesPanelProps {
  onClose: () => void;
  onGoBack: () => void;
  repositories: ViewModelRepositories;
}

interface MessageTime {
  isCustom: boolean;
  text: string;
  value: number;
}

const TimedMessagesPanel: React.FC<TimedMessagesPanelProps> = ({onClose, onGoBack, repositories}) => {
  const conversationState = container.resolve(ConversationState);
  const [currentMessageTimer, setCurrentMessageTimer] = useState(0);
  const [messageTimes, setMessageTimes] = useState<MessageTime[]>([]);
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);
  const {globalMessageTimer} = useKoSubscribableChildren(activeConversation, ['globalMessageTimer']);

  useEffect(() => {
    const messageTimer = globalMessageTimer ?? 0;
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
    if (activeConversation) {
      const finalTimer = value === 0 ? null : value;
      activeConversation.globalMessageTimer(finalTimer);
      repositories.conversation.updateConversationMessageTimer(activeConversation, finalTimer);
    }
  };
  return (
    <>
      <PanelHeader
        onGoBack={onGoBack}
        onClose={onClose}
        title={t('timedMessagesTitle')}
        goBackUie="go-back-timed-messages-options"
      />
      <div ref={setScrollbarRef} className="panel__content">
        {messageTimes.map(({text, isCustom, value}) => (
          <label
            key={value}
            className="panel__action-item panel__action-item__option"
            data-uie-name="item-timed-messages-option"
          >
            <input
              type="radio"
              name="timed-message-settings"
              disabled={isCustom}
              value={value}
              checked={currentMessageTimer === value}
              onChange={() => timedMessageChange(value)}
            />
            <span>{text}</span>
          </label>
        ))}
        <div className="panel__info-text timed-messages__disclaimer">{t('timedMessageDisclaimer')}</div>
      </div>
    </>
  );
};

export default TimedMessagesPanel;

registerReactComponent('timed-messages-panel', {
  component: TimedMessagesPanel,
  template: '<div data-bind="react: {onGoBack, onClose, repositories}"></div>',
});
