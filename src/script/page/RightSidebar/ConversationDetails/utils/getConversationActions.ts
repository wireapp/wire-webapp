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

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {MenuItem} from 'Components/panel/PanelActions';
import {t} from 'Util/LocalizerUtil';

import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {Conversation} from '../../../../entity/Conversation';
import * as UserPermission from '../../../../user/UserPermission';
import {ActionsViewModel} from '../../../../view_model/ActionsViewModel';

const getConversationActions = (
  conversationEntity: Conversation,
  actionsViewModel: ActionsViewModel,
  conversationRepository: ConversationRepository,
  teamRole: UserPermission.ROLE,
  isServiceMode: boolean = false,
  isTeam: boolean = false,
): MenuItem[] => {
  if (!conversationEntity) {
    return [];
  }

  const roleRepository = conversationRepository.conversationRoleRepository;

  const is1to1Action = conversationEntity.is1to1();
  const isSingleUser = is1to1Action || conversationEntity.isRequest();
  const userEntity = conversationEntity.firstUserEntity();

  const getNextConversation = () => conversationRepository.getNextConversation(conversationEntity);
  const userPermissions = UserPermission.generatePermissionHelpers(teamRole);

  const allMenuElements = [
    {
      condition: userPermissions.canCreateGroupConversation() && is1to1Action && !isServiceMode,
      item: {
        click: () => amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details', userEntity),
        icon: 'group-icon',
        identifier: 'go-create-group',
        label: t('conversationDetailsActionCreateGroup'),
      },
    },
    {
      condition: !conversationEntity.is_archived(),
      item: {
        click: async () => actionsViewModel.archiveConversation(conversationEntity),
        icon: 'archive-icon',
        identifier: 'do-archive',
        label: t('conversationDetailsActionArchive'),
      },
    },
    {
      condition: conversationEntity.is_archived(),
      item: {
        click: async () => actionsViewModel.unarchiveConversation(conversationEntity),
        icon: 'archive-icon',
        identifier: 'do-unarchive',
        label: t('conversationsPopoverUnarchive'),
      },
    },
    {
      condition: conversationEntity.isRequest(),
      item: {
        click: async () => actionsViewModel.cancelConnectionRequest(userEntity, true, getNextConversation()),
        icon: 'close-icon',
        identifier: 'do-cancel-request',
        label: t('conversationDetailsActionCancelRequest'),
      },
    },
    {
      condition: conversationEntity.isClearable(),
      item: {
        click: () => actionsViewModel.clearConversation(conversationEntity),
        icon: 'eraser-icon',
        identifier: 'do-clear',
        label: t('conversationDetailsActionClear'),
      },
    },
    {
      condition: isSingleUser && (userEntity?.isConnected() || userEntity?.isRequest()),
      item: {
        click: () => actionsViewModel.blockUser(userEntity, true, getNextConversation()),
        icon: 'block-icon',
        identifier: 'do-block',
        label: t('conversationDetailsActionBlock'),
      },
    },
    {
      condition: conversationEntity.isLeavable() && roleRepository.canLeaveGroup(conversationEntity),
      item: {
        click: async () => actionsViewModel.leaveConversation(conversationEntity),
        icon: 'leave-icon',
        identifier: 'do-leave',
        label: t('conversationDetailsActionLeave'),
      },
    },
    {
      condition:
        !isSingleUser &&
        isTeam &&
        roleRepository.canDeleteGroup(conversationEntity) &&
        conversationEntity.isCreatedBySelf(),
      item: {
        click: async () => actionsViewModel.deleteConversation(conversationEntity),
        icon: 'delete-icon',
        identifier: 'do-delete',
        label: t('conversationDetailsActionDelete'),
      },
    },
  ];

  return allMenuElements.filter(menuElement => menuElement.condition).map(menuElement => menuElement.item);
};

export {getConversationActions};
