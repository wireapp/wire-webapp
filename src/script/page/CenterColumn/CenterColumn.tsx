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

import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import {FC, useEffect, useState} from 'react';

import HistoryExport from 'Components/HistoryExport';
import ConnectRequests from 'Components/ConnectRequests';
import ConversationList from 'Components/Conversation';
import GroupCreationModal from 'Components/Modals/GroupCreation/GroupCreationModal';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import MainContent from '../MainContent';
import RootProvider from '../RootProvider';

import {Conversation} from '../../entity/Conversation';
import {Message} from '../../entity/message/Message';
import {ContentViewModel} from '../../view_model/ContentViewModel';

interface ShowConversationOptions {
  exposeMessage?: Message;
  openFirstSelfMention?: boolean;
  openNotificationSettings?: boolean;
}

const statesTitle = {
  [ContentViewModel.STATE.CONNECTION_REQUESTS]: t('accessibility.headings.connectionRequests'),
  [ContentViewModel.STATE.CONVERSATION]: t('accessibility.headings.conversation'),
  [ContentViewModel.STATE.HISTORY_EXPORT]: t('accessibility.headings.historyExport'),
  [ContentViewModel.STATE.HISTORY_IMPORT]: t('accessibility.headings.historyImport'),
};

interface CenterColumnProps {
  contentViewModel: ContentViewModel;
}

const CenterColumn: FC<CenterColumnProps> = ({contentViewModel}) => {
  const {state} = useKoSubscribableChildren(contentViewModel, ['state']);
  const {conversationRepository} = contentViewModel;
  const conversationState = conversationRepository.getConversationState();

  const [initialMessage, setInitialMessage] = useState<Message>();

  const teamState = contentViewModel.getTeamState();
  const userState = contentViewModel.getUserState();

  const title = statesTitle[state];

  const onConversationShow = (conversation: Conversation, options: ShowConversationOptions) => {
    const {exposeMessage: exposeMessageEntity, openFirstSelfMention = false} = options;
    const messageEntity = openFirstSelfMention ? conversation.getFirstUnreadSelfMention() : exposeMessageEntity;

    const activeConversation = conversationState.activeConversation();
    activeConversation?.release();

    setInitialMessage(messageEntity);
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, onConversationShow);

    return () => {
      amplify.unsubscribe(WebAppEvents.CONVERSATION.SHOW, onConversationShow);
    };
  }, []);

  return (
    <RootProvider value={contentViewModel}>
      <MainContent contentViewModel={contentViewModel} />

      <h1 className="visually-hidden">{title}</h1>

      {state === ContentViewModel.STATE.CONNECTION_REQUESTS && (
        <ConnectRequests teamState={teamState} userState={userState} />
      )}

      {state === ContentViewModel.STATE.CONVERSATION && (
        <ConversationList initialMessage={initialMessage} teamState={teamState} userState={userState} />
      )}

      {state === ContentViewModel.STATE.HISTORY_EXPORT && <HistoryExport userState={userState} />}

      <GroupCreationModal userState={userState} teamState={teamState} />

      <div className="center-column__overlay" />
    </RootProvider>
  );
};

export default CenterColumn;

registerReactComponent('center-column', CenterColumn);
