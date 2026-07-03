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
import type {RootContextValue} from 'src/script/page/rootProvider';

import {ChatHistory, ConversationAccess, ConversationType, HistorySharingUnit} from './types';

export type Translate = RootContextValue['translate'];

export type NonFederatingParticipantsModalCopy = {
  readonly editParticipantsButtonText: string;
  readonly leaveButtonText: string;
  readonly titleText: string;
  readonly getMessageHtml: (backendString: string, replaceBackends: Record<string, string>) => string;
};

export const getConversationAccessOptions = (translate: Translate, isPublicOptionEnabled = true) => {
  return [
    {
      value: ConversationAccess.Public,
      label: translate('createConversationAccessOptionPublic'),
      isDisabled: !isPublicOptionEnabled,
    },
    {
      value: ConversationAccess.Private,
      label: translate('createConversationAccessOptionPrivate'),
    },
  ];
};

export const getConversationManagerOptions = (translate: Translate) => {
  return [
    {
      value: ADD_PERMISSION.ADMINS,
      label: translate('createConversationManagerOptionAdmins'),
    },
    {
      value: ADD_PERMISSION.EVERYONE,
      label: translate('createConversationManagerOptionAdminsAndMembers'),
    },
  ];
};

export const getConversationTypeOptions = (translate: Translate) => {
  return [
    {
      conversationType: ConversationType.Channel,
      label: translate('conversationTypeChannelOption'),
    },
    {
      conversationType: ConversationType.Group,
      label: translate('conversationTypeGroupOption'),
    },
  ];
};

export const getChatHistorySharingUnitOptions = (translate: Translate, historySharingQuantity: number) => {
  const chatHistorySharingUnitOptions = [
    {
      value: HistorySharingUnit.Days,
      label:
        historySharingQuantity !== 0 && !Number.isNaN(historySharingQuantity) && historySharingQuantity > 1
          ? translate('conversationHistoryModalOptionDays')
          : translate('conversationHistoryModalOptionDay'),
    },
    {
      value: HistorySharingUnit.Weeks,
      label:
        historySharingQuantity !== 0 && !Number.isNaN(historySharingQuantity) && historySharingQuantity > 1
          ? translate('conversationHistoryModalOptionWeeks')
          : translate('conversationHistoryModalOptionWeek'),
    },
    {
      value: HistorySharingUnit.Months,
      label:
        historySharingQuantity !== 0 && !Number.isNaN(historySharingQuantity) && historySharingQuantity > 1
          ? translate('conversationHistoryModalOptionMonths')
          : translate('conversationHistoryModalOptionMonth'),
    },
  ];

  return chatHistorySharingUnitOptions;
};

export const getChatHistoryOptions = (
  translate: Translate,
  chatHistory: ChatHistory,
  historySharingQuantity: number,
  historySharingUnit: HistorySharingUnit,
  enableCustomHistory?: boolean,
) => {
  const teamState = container.resolve(TeamState);
  const chatHistorySharingUnitOptions = getChatHistorySharingUnitOptions(translate, historySharingQuantity);

  const chatHistoryOptions = [
    {
      value: ChatHistory.Off,
      label: translate('conversationHistoryOptionOff'),
    },
    {
      value: ChatHistory.OneDay,
      label: translate('conversationHistoryOptionDay'),
    },
  ];

  if (teamState.isConferenceCallingEnabled()) {
    chatHistoryOptions.push(
      {
        value: ChatHistory.OneWeek,
        label: translate('conversationHistoryOptionWeek'),
      },
      {
        value: ChatHistory.Unlimited,
        label: translate('conversationHistoryOptionUnlimited'),
      },
    );
  }

  if (enableCustomHistory === true || teamState.isConferenceCallingEnabled()) {
    chatHistoryOptions.push({
      value: ChatHistory.Custom,
      label: `${translate('conversationHistoryOptionCustom')}${chatHistory === ChatHistory.Custom && historySharingQuantity !== 0 && !Number.isNaN(historySharingQuantity) ? ` (${historySharingQuantity} ${chatHistorySharingUnitOptions.find(option => option.value === historySharingUnit)?.label})` : ''}`,
    });
  }

  return chatHistoryOptions;
};

export const getNonFederatingParticipantsModalCopy = (translate: Translate): NonFederatingParticipantsModalCopy => {
  return {
    editParticipantsButtonText: translate('groupCreationPreferencesNonFederatingEditList'),
    leaveButtonText: translate('groupCreationPreferencesNonFederatingLeave'),
    titleText: translate('groupCreationPreferencesNonFederatingHeadline'),
    getMessageHtml: (backendString: string, replaceBackends: Record<string, string>) => {
      return translate('groupCreationPreferencesNonFederatingMessage', {backends: backendString}, replaceBackends);
    },
  };
};
