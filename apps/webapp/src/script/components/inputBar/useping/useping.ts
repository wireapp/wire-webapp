/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useState} from 'react';

import {PrimaryModal} from 'Components/modals/primarymodal';
import {MessageRepository} from 'Repositories/conversation/messagerepository';
import {Conversation} from 'Repositories/entity/conversation';
import {Config} from 'src/script/config';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

interface UsePingProps {
  conversation: Conversation;
  messageRepository: MessageRepository;
  is1to1: boolean;
}

export const usePing = ({conversation, messageRepository, is1to1}: UsePingProps) => {
  const {fireAndForgetInvoker, translate} = useApplicationContext();
  const [isPingDisabled, setIsPingDisabled] = useState(false);

  const maxUsersWithoutAlert = Config.getConfig().FEATURE.MAX_USERS_TO_PING_WITHOUT_ALERT;
  const enablePingConfirmation = Config.getConfig().FEATURE.ENABLE_PING_CONFIRMATION;

  const pingConversation = () => {
    setIsPingDisabled(true);
    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await messageRepository.sendPing(conversation);
      window.setTimeout(() => setIsPingDisabled(false), TIME_IN_MILLIS.SECOND * 2);
    });
  };

  const handlePing = () => {
    if (isPingDisabled) {
      return;
    }

    const totalConversationUsers = conversation.participating_user_ets().length;
    if (!enablePingConfirmation || is1to1 || totalConversationUsers < maxUsersWithoutAlert) {
      pingConversation();
    } else {
      PrimaryModal.show(
        PrimaryModal.type.CONFIRM,
        {
          primaryAction: {
            action: pingConversation,
            text: translate('tooltipConversationPing'),
          },
          text: {
            title: translate('conversationPingConfirmTitle', {memberCount: totalConversationUsers.toString()}),
          },
        },
        undefined,
        translate,
      );
    }
  };

  return {
    isPingDisabled,
    handlePing,
  };
};
