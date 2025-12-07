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

import {TeamState} from 'Repositories/team/TeamState';
import {t} from 'Util/LocalizerUtil';

import {ChatHistory, ConversationAccess, ConversationType, HistorySharingUnit} from './types';

export const getConversationAccessOptions = (isPublicOptionEnabled = true) => {
  return [
    {
      value: ConversationAccess.Public,
      label: t('createConversationAccessOptionPublic'),
      isDisabled: !isPublicOptionEnabled,
    },
    {
      value: ConversationAccess.Private,
      label: t('createConversationAccessOptionPrivate'),
    },
  ];
};

export const getConversationManagerOptions = () => {
  return [
    {
      value: ADD_PERMISSION.ADMINS,
      label: t('createConversationManagerOptionAdmins'),
    },
    {
      value: ADD_PERMISSION.EVERYONE,
      label: t('createConversationManagerOptionAdminsAndMembers'),
    },
  ];
};

export const getConversationTypeOptions = () => {
  return [
    {
      conversationType: ConversationType.Channel,
      label: t('conversationTypeChannelOption'),
    },
    {
      conversationType: ConversationType.Group,
      label: t('conversationTypeGroupOption'),
    },
  ];
};

export const getChatHistorySharingUnitOptions = (historySharingQuantity: number) => {
  const chatHistorySharingUnitOptions = [
    {
      value: HistorySharingUnit.Days,
      label:
        historySharingQuantity && historySharingQuantity > 1
          ? t('conversationHistoryModalOptionDays')
          : t('conversationHistoryModalOptionDay'),
    },
    {
      value: HistorySharingUnit.Weeks,
      label:
        historySharingQuantity && historySharingQuantity > 1
          ? t('conversationHistoryModalOptionWeeks')
          : t('conversationHistoryModalOptionWeek'),
    },
    {
      value: HistorySharingUnit.Months,
      label:
        historySharingQuantity && historySharingQuantity > 1
          ? t('conversationHistoryModalOptionMonths')
          : t('conversationHistoryModalOptionMonth'),
    },
  ];

  return chatHistorySharingUnitOptions;
};

export const getChatHistoryOptions = (
  chatHistory: ChatHistory,
  historySharingQuantity: number,
  historySharingUnit: HistorySharingUnit,
  enableCustomHistory?: boolean,
) => {
  const teamState = container.resolve(TeamState);
  const chatHistorySharingUnitOptions = getChatHistorySharingUnitOptions(historySharingQuantity);

  const chatHistoryOptions = [
    {
      value: ChatHistory.Off,
      label: t('conversationHistoryOptionOff'),
    },
    {
      value: ChatHistory.OneDay,
      label: t('conversationHistoryOptionDay'),
    },
  ];

  if (teamState.isConferenceCallingEnabled()) {
    chatHistoryOptions.push(
      {
        value: ChatHistory.OneWeek,
        label: t('conversationHistoryOptionWeek'),
      },
      {
        value: ChatHistory.Unlimited,
        label: t('conversationHistoryOptionUnlimited'),
      },
    );
  }

  if (enableCustomHistory || teamState.isConferenceCallingEnabled()) {
    chatHistoryOptions.push({
      value: ChatHistory.Custom,
      label: `${t('conversationHistoryOptionCustom')}${chatHistory === ChatHistory.Custom && historySharingQuantity ? ` (${historySharingQuantity} ${chatHistorySharingUnitOptions.find(option => option.value === historySharingUnit)?.label})` : ''}`,
    });
  }

  return chatHistoryOptions;
};
