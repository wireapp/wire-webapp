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

import {useState, useContext} from 'react';

import {ADD_PERMISSION, ConversationProtocol, GROUP_CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import {isNonFederatingBackendsError} from '@wireapp/core/lib/errors';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {ACCESS_STATE} from 'Repositories/conversation/AccessState';
import {
  toggleFeature,
  teamPermissionsForAccessState,
  ACCESS_TYPES,
  ACCESS_MODES,
} from 'Repositories/conversation/ConversationAccessPermission';
import {TeamState} from 'Repositories/team/TeamState';
import {Config} from 'src/script/Config';
import {useSidebarStore, SidebarTabs} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {RootContext} from 'src/script/page/RootProvider';
import {generateConversationUrl} from 'src/script/router/routeGenerator';
import {createNavigateKeyboard, createNavigate} from 'src/script/router/routerBindings';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isKeyboardEvent} from 'Util/KeyboardUtil';
import {replaceLink, t} from 'Util/LocalizerUtil';

import {PrimaryModal} from '../../PrimaryModal';
import {useCreateConversationModal} from '../hooks/useCreateConversationModal';
import {ConversationAccess, ConversationCreationStep, ConversationType} from '../types';

export const useCreateConversation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const {
    conversationName,
    hideModal,
    showModal,
    selectedContacts,
    setConversationName,
    setConversationCreationStep,
    isCellsEnabled,
    isReadReceiptsEnabled,
    isServicesEnabled,
    isGuestsEnabled,
    conversationType,
    access: conversationAccess,
    moderator,
  } = useCreateConversationModal();
  const {setCurrentTab: setCurrentSidebarTab} = useSidebarStore();

  const mainViewModel = useContext(RootContext);
  const {content: contentViewModel} = mainViewModel!;
  const {conversation: conversationRepository} = contentViewModel.repositories;
  const teamState = container.resolve(TeamState);
  const {isTeam, isMLSEnabled} = useKoSubscribableChildren(teamState, ['isTeam', 'isMLSEnabled']);

  const defaultProtocol = isMLSEnabled
    ? teamState.teamFeatures()?.mls?.config.defaultProtocol
    : ConversationProtocol.PROTEUS;

  // Read receipts are temorarily disabled for MLS groups and channels until it is supported
  const isGroupWithReadReceiptsEnabled = defaultProtocol !== ConversationProtocol.MLS && isReadReceiptsEnabled;

  const getAccessState = () => {
    let access = ACCESS_STATE.TEAM.TEAM_ONLY;
    if (isGuestsEnabled) {
      access = toggleFeature(teamPermissionsForAccessState(ACCESS_STATE.TEAM.GUEST_FEATURES), access);
    }

    if (conversationAccess === ConversationAccess.Public && conversationType === ConversationType.Channel) {
      access = toggleFeature(ACCESS_MODES.LINK, access);
    }

    if (isServicesEnabled && conversationType !== ConversationType.Channel) {
      access = toggleFeature(ACCESS_TYPES.SERVICE, access);
    }

    return access;
  };

  const showParticipantsListEditModal = (
    conversationName: string,
    backendString: string,
    replaceBackends: Record<string, string>,
  ) => {
    PrimaryModal.show(PrimaryModal.type.MULTI_ACTIONS, {
      preventClose: true,
      primaryAction: {
        text: t('groupCreationPreferencesNonFederatingEditList'),
        action: () => {
          setConversationName(conversationName);
          showModal();
          setIsLoading(false);
          setConversationCreationStep(ConversationCreationStep.ParticipantsSelection);
        },
      },
      secondaryAction: {
        text: t('groupCreationPreferencesNonFederatingLeave'),
        action: () => {
          setIsLoading(false);
        },
      },
      text: {
        htmlMessage: t('groupCreationPreferencesNonFederatingMessage', {backends: backendString}, replaceBackends),
        title: t('groupCreationPreferencesNonFederatingHeadline'),
      },
    });
  };

  const handleException = (error: Error, conversationName: string) => {
    if (isNonFederatingBackendsError(error)) {
      hideModal();

      const backendString = error.backends.join(', and ');
      const replaceBackends = replaceLink(
        Config.getConfig().URL.SUPPORT.NON_FEDERATING_INFO,
        'modal__text__read-more',
        'read-more-backends',
      );
      showParticipantsListEditModal(conversationName, backendString, replaceBackends);
    }
  };

  const onSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent<HTMLInputElement>,
  ): Promise<void> => {
    setIsLoading(true);

    try {
      const conversation = await conversationRepository.createGroupConversation(
        selectedContacts,
        conversationName,
        isTeam ? getAccessState() : undefined,
        {
          add_permission: moderator === ADD_PERMISSION.ADMINS ? ADD_PERMISSION.ADMINS : ADD_PERMISSION.EVERYONE,
          protocol: defaultProtocol,
          receipt_mode: isGroupWithReadReceiptsEnabled ? RECEIPT_MODE.ON : RECEIPT_MODE.OFF,
          cells: isCellsEnabled,
          group_conv_type:
            conversationType === ConversationType.Channel
              ? GROUP_CONVERSATION_TYPE.CHANNEL
              : GROUP_CONVERSATION_TYPE.GROUP_CONVERSATION,
        },
      );

      setCurrentSidebarTab(SidebarTabs.RECENT);

      if (isKeyboardEvent(event)) {
        createNavigateKeyboard(generateConversationUrl(conversation.qualifiedId), true)(event);
      } else {
        createNavigate(generateConversationUrl(conversation.qualifiedId))(event);
      }
    } catch (error) {
      handleException(error as Error, conversationName);
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, undefined, {});
      setIsLoading(false);
    }

    hideModal();
  };

  return {
    isLoading,
    onSubmit,
  };
};
