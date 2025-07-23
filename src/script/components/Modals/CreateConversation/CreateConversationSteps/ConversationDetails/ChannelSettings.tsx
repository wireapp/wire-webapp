/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {ADD_PERMISSION} from '@wireapp/api-client/lib/conversation';
import {container} from 'tsyringe';

import {Muted, Option, Select} from '@wireapp/react-ui-kit';

import {RadioGroup} from 'Components/Radio';
import {TeamState} from 'Repositories/team/TeamState';
import {t} from 'Util/LocalizerUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {channelSettingsTextCss} from './ConversationDetails.styles';
import {CustomHistorySharingOption} from './CustomHistorySharingOption';

import {useCreateConversationModal} from '../../hooks/useCreateConversationModal';
import {ChatHistory, ConversationAccess} from '../../types';
import {getConversationAccessOptions, getChatHistoryOptions, getConversationManagerOptions} from '../../utils';

export const ChannelSettings = () => {
  const teamState = container.resolve(TeamState);
  const {
    access,
    chatHistory,
    setChatHistory,
    setAccess,
    moderator,
    setModerator,
    setIsCustomHistoryModalOpen,
    setIsUpgradeTeamModalOpen,
    historySharingQuantity,
    historySharingUnit,
  } = useCreateConversationModal();
  const isPremiumUser = teamState.isConferenceCallingEnabled();
  const {isPublicChannelsEnabled, isChannelsHistorySharingEnabled} = useChannelsFeatureFlag();
  const chatHistoryOptions = getChatHistoryOptions(chatHistory, historySharingQuantity, historySharingUnit, true);
  const onChatHistoryChange = (option?: Option | null) => {
    if (option?.value === ChatHistory.Custom) {
      if (!isPremiumUser) {
        setIsUpgradeTeamModalOpen(true);
        return;
      }

      setIsCustomHistoryModalOpen(true);
      return;
    }
    setChatHistory(option?.value as ChatHistory);
  };

  return (
    <>
      <p className="heading-h3">Access</p>
      <p css={channelSettingsTextCss} className="subline">
        {t('createConversationAccessText')}
      </p>

      <RadioGroup<ConversationAccess>
        onChange={setAccess}
        horizontal
        selectedValue={access}
        options={getConversationAccessOptions(isPublicChannelsEnabled)}
        ariaLabelledBy="conversation-access"
        name="conversation-access"
      />

      <Muted block muted={access === ConversationAccess.Public} css={channelSettingsTextCss}>
        {t('createConversationManagerText')}
      </Muted>

      <RadioGroup<ADD_PERMISSION>
        disabled={access === ConversationAccess.Public}
        onChange={setModerator}
        horizontal
        selectedValue={moderator}
        options={getConversationManagerOptions()}
        ariaLabelledBy="conversation-manager"
        name="conversation-manager"
      />
      {isChannelsHistorySharingEnabled && (
        <>
          <p className="heading-h3">Conversation history</p>
          <p className="subline" css={channelSettingsTextCss}>
            {t('conversationHistoryText')}
          </p>

          <Select
            id="chat-history-select"
            dataUieName="chat-history-select"
            value={chatHistoryOptions.find(option => option.value === chatHistory)}
            onChange={onChatHistoryChange}
            formatOptionLabel={option => <CustomHistorySharingOption isPremiumUser={isPremiumUser} option={option} />}
            options={chatHistoryOptions}
          />
        </>
      )}
    </>
  );
};
