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
import * as Icon from 'Components/Icon';
import {MenuItem} from 'Components/panel/PanelActions';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import * as UserPermission from 'Repositories/user/UserPermission';
import {t} from 'Util/LocalizerUtil';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Config} from '../../../../Config';
import {ActionsViewModel} from '../../../../view_model/ActionsViewModel';

interface GetConversationActionsParams {
  conversationEntity: Conversation;
  actionsViewModel: ActionsViewModel;
  conversationRepository: ConversationRepository;
  teamRole: UserPermission.ROLE;
  isServiceMode?: boolean;
  isTeam?: boolean;
  isParticipantBlocked?: boolean;
}

const getConversationActions = ({
  conversationEntity,
  actionsViewModel,
  conversationRepository,
  teamRole,
  isServiceMode = false,
  isTeam = false,
  isParticipantBlocked = false,
}: GetConversationActionsParams): MenuItem[] => {
  if (!conversationEntity) {
    return [];
  }

  const roleRepository = conversationRepository.conversationRoleRepository;

  const is1to1Action = conversationEntity.is1to1();
  const isSingleUser = is1to1Action || conversationEntity.isRequest();
  const userEntity = conversationEntity.firstUserEntity();

  const getNextConversation = () => conversationRepository.getNextConversation(conversationEntity);
  const userPermissions = UserPermission.generatePermissionHelpers(teamRole);

  const allMenuElements: {item: MenuItem; condition: boolean}[] = [
    {
      condition: userPermissions.canCreateGroupConversation() && is1to1Action && !isServiceMode,
      item: {
        click: () => amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details', userEntity),
        Icon: Icon.GroupIcon,
        identifier: 'go-create-group',
        label: t('conversationDetailsActionCreateGroup'),
      },
    },
    {
      condition: !conversationEntity.is_archived(),
      item: {
        click: async () => actionsViewModel.archiveConversation(conversationEntity),
        Icon: Icon.ArchiveIcon,
        identifier: 'do-archive',
        label: t('conversationDetailsActionArchive'),
      },
    },
    {
      condition: conversationEntity.is_archived(),
      item: {
        click: async () => actionsViewModel.unarchiveConversation(conversationEntity),
        Icon: Icon.ArchiveIcon,
        identifier: 'do-unarchive',
        label: t('conversationsPopoverUnarchive'),
      },
    },
    {
      condition: conversationEntity.isRequest(),
      item: {
        click: async () => {
          if (!userEntity) {
            return;
          }
          void actionsViewModel.cancelConnectionRequest(userEntity, true, getNextConversation());
        },
        Icon: Icon.CloseIcon,
        identifier: 'do-cancel-request',
        label: t('conversationDetailsActionCancelRequest'),
      },
    },
    {
      condition: conversationEntity.isClearable(),
      item: {
        click: () => actionsViewModel.clearConversation(conversationEntity),
        Icon: Icon.EraserIcon,
        identifier: 'do-clear',
        label: t('conversationDetailsActionClear'),
      },
    },
    {
      condition: isSingleUser && Boolean(userEntity?.isConnected() || userEntity?.isRequest()),
      item: {
        click: () => {
          if (!userEntity) {
            return;
          }
          void actionsViewModel.blockUser(userEntity);
        },
        Icon: Icon.BlockIcon,
        identifier: 'do-block',
        label: t('conversationDetailsActionBlock'),
      },
    },
    {
      condition: isSingleUser && isParticipantBlocked,
      item: {
        click: () => {
          if (!userEntity) {
            return;
          }
          void actionsViewModel.unblockUser(userEntity);
        },
        Icon: Icon.BlockIcon,
        identifier: 'do-unblock',
        label: t('conversationDetailsActionUnblock'),
      },
    },
    {
      condition: conversationEntity.isLeavable() && roleRepository.canLeaveGroup(conversationEntity),
      item: {
        click: async () => actionsViewModel.leaveConversation(conversationEntity),
        Icon: Icon.LeaveIcon,
        identifier: 'do-leave',
        label: conversationEntity.isChannel() ? t('channelDetailsActionLeave') : t('groupDetailsActionLeave'),
      },
    },
    {
      condition:
        !isSingleUser &&
        isTeam &&
        roleRepository.canDeleteGroup(conversationEntity) &&
        !conversationEntity.isSelfUserRemoved() &&
        conversationEntity.inTeam(),
      item: {
        click: () => actionsViewModel.deleteConversation(conversationEntity),
        Icon: Icon.DeleteIcon,
        identifier: 'do-delete',
        label: conversationEntity.isChannel() ? t('channelDetailsActionDelete') : t('groupDetailsActionDelete'),
      },
    },
    {
      condition:
        conversationEntity.isGroupOrChannel() &&
        conversationEntity.isSelfUserRemoved() &&
        Config.getConfig().FEATURE.ENABLE_REMOVE_GROUP_CONVERSATION,
      item: {
        click: () => actionsViewModel.removeConversation(conversationEntity),
        Icon: Icon.CloseIcon,
        identifier: 'do-remove',
        label: t('conversationDetailsActionDeleteForMe'),
      },
    },
  ];

  return allMenuElements.filter(menuElement => menuElement.condition).map(menuElement => menuElement.item);
};

export {getConversationActions};
