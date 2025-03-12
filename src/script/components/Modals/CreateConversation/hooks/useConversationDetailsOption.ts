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

import {t} from 'Util/LocalizerUtil';

import {useCreateConversationModal} from './useCreateConversationModal';

import {HistorySharingUnit, ChatHistory, ConversationAccess, ConversationManager, ConversationType} from '../types';

export const useConversationDetailsOption = () => {
  const {chatHistory, historySharingQuantity, historySharingUnit} = useCreateConversationModal();

  const chatHistorySharingUnitOptions = [
    {
      value: HistorySharingUnit.Days,
      label:
        historySharingQuantity && historySharingQuantity > 1
          ? t('conversationHistoryModalOptionDays')
          : t('conversationHistoryModalOptionDays'),
    },
    {
      value: HistorySharingUnit.Weeks,
      label:
        historySharingQuantity && historySharingQuantity > 1
          ? t('conversationHistoryModalOptionWeek')
          : t('conversationHistoryModalOptionWeeks'),
    },
    {
      value: HistorySharingUnit.Months,
      label:
        historySharingQuantity && historySharingQuantity > 1
          ? t('conversationHistoryModalOptionMonth')
          : t('conversationHistoryModalOptionMonths'),
    },
  ];

  const chatHistoryOptions = [
    {
      value: ChatHistory.Off,
      label: t('conversationHistoryOptionOff'),
    },
    {
      value: ChatHistory.OneDay,
      label: t('conversationHistoryOptionDay'),
    },
    {
      value: ChatHistory.OneWeek,
      label: t('conversationHistoryOptionWeek'),
    },
    {
      value: ChatHistory.Unlimited,
      label: t('conversationHistoryOptionUnlimited'),
    },
    {
      value: ChatHistory.Custom,
      label: `${t('conversationHistoryOptionCustom')}${chatHistory === ChatHistory.Custom ? ` (${historySharingQuantity} ${chatHistorySharingUnitOptions.find(option => option.value === historySharingUnit)?.label})` : ''}`,
    },
  ];

  const conversationAccessOptions = [
    {
      value: ConversationAccess.Public,
      label: t('createConversationAccessOptionPublic'),
    },
    {
      value: ConversationAccess.Private,
      label: t('createConversationAccessOptionPrivate'),
    },
  ];

  const conversationManagerOptions = [
    {
      value: ConversationManager.Admins,
      label: t('createConversationManagerOptionAdmins'),
    },
    {
      value: ConversationManager.AdminsAndMembers,
      label: t('createConversationManagerOptionAdminsAndMembers'),
    },
  ];

  const conversationTypeOptions = [
    {
      conversationType: ConversationType.Channel,
      label: t('conversationTypeChannelOption'),
    },
    {
      conversationType: ConversationType.Group,
      label: t('conversationTypeGroupOption'),
    },
  ];

  return {
    chatHistoryOptions,
    chatHistorySharingUnitOptions,
    conversationAccessOptions,
    conversationManagerOptions,
    conversationTypeOptions,
  };
};
