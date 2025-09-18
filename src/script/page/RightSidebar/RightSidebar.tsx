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

import {cloneElement, FC, ReactNode, useCallback, useEffect, useState} from 'react';

import {amplify} from 'amplify';
import {CSSTransition, TransitionGroup} from 'react-transition-group';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Conversation} from 'Repositories/entity/Conversation';
import {Message} from 'Repositories/entity/message/Message';
import {User} from 'Repositories/entity/User';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/UserState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {Access} from './Access/Access';
import {AddParticipants} from './AddParticipants';
import {ConversationDetails} from './ConversationDetails';
import {ConversationHistory} from './ConversationHistory/ConversationHistory';
import {ConversationParticipants} from './ConversationParticipants';
import {GroupParticipantService} from './GroupParticipantService';
import {GroupParticipantUser} from './GroupParticipantUser';
import {GuestServicesOptions} from './GuestServicesOptions';
import {MessageDetails} from './MessageDetails';
import {Notifications} from './Notifications';
import {ParticipantDevices} from './ParticipantDevices';
import {TimedMessages} from './TimedMessages';

import {isReadableMessage} from '../../guards/Message';
import {isUserEntity, isUserServiceEntity} from '../../guards/Panel';
import {isServiceEntity} from '../../guards/Service';
import {Core} from '../../service/CoreSingleton';
import {ActionsViewModel} from '../../view_model/ActionsViewModel';
import {ViewModelRepositories} from '../../view_model/MainViewModel';
import {RightSidebarParams} from '../AppMain';
import {useAppMainState} from '../state';
import {ContentState} from '../useAppState';

export const OPEN_CONVERSATION_DETAILS = 'OPEN_CONVERSATION_DETAILS';
export const rightPanelAnimationTimeout = 350; // ms

const Animated: FC<{children: ReactNode}> = ({children, ...rest}) => (
  <CSSTransition classNames="right-to-left" timeout={rightPanelAnimationTimeout} {...rest}>
    {children}
  </CSSTransition>
);

export enum PanelState {
  ADD_PARTICIPANTS = 'ADD_PARTICIPANTS',
  CONVERSATION_DETAILS = 'CONVERSATION_DETAILS',
  CONVERSATION_PARTICIPANTS = 'CONVERSATION_PARTICIPANTS',
  GROUP_PARTICIPANT_SERVICE = 'GROUP_PARTICIPANT_SERVICE',
  GROUP_PARTICIPANT_USER = 'GROUP_PARTICIPANT_USER',
  GUEST_OPTIONS = 'GUEST_OPTIONS',
  MESSAGE_DETAILS = 'MESSAGE_DETAILS',
  NOTIFICATIONS = 'NOTIFICATIONS',
  PARTICIPANT_DEVICES = 'DEVICES',
  SERVICES_OPTIONS = 'SERVICES_OPTIONS',
  TIMED_MESSAGES = 'TIMED_MESSAGES',
  ACCESS = 'ACCESS',
  CONVERSATION_HISTORY = 'CONVERSATION_HISTORY',
}

export type PanelEntity = Conversation | User | Message | ServiceEntity;

interface RightSidebarProps {
  currentEntity?: RightSidebarParams['entity'];
  actionsViewModel: ActionsViewModel;
  repositories: ViewModelRepositories;
  teamState: TeamState;
  userState: UserState;
  selfUser: User;
  isFederated: boolean;
  lastViewedMessageDetailsEntity: Message | null;
  core?: Core;
}

const RightSidebar: FC<RightSidebarProps> = ({
  currentEntity,
  actionsViewModel,
  repositories,
  teamState,
  userState,
  selfUser,
  isFederated,
  lastViewedMessageDetailsEntity,
  core = container.resolve(Core),
}) => {
  const {
    conversation: conversationRepository,
    integration: integrationRepository,
    search: searchRepository,
    team: teamRepository,
    user: userRepository,
  } = repositories;
  const {conversationRoleRepository} = conversationRepository;
  const conversationState = container.resolve(ConversationState);
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);

  const [animatePanelToLeft, setAnimatePanelToLeft] = useState<boolean>(true);

  const {rightSidebar} = useAppMainState.getState();
  const lastItem = rightSidebar.history.length - 1;
  const currentState = rightSidebar.history[lastItem];

  const userEntity = currentEntity && isUserEntity(currentEntity) ? currentEntity : null;
  const userServiceEntity = currentEntity && isUserServiceEntity(currentEntity) ? currentEntity : null;
  const messageEntity = currentEntity && isReadableMessage(currentEntity) ? currentEntity : null;
  const serviceEntity = currentEntity && isServiceEntity(currentEntity) ? currentEntity : null;

  const goToRoot = () => rightSidebar.goToRoot(activeConversation || null);

  const closePanel = () => rightSidebar.close();

  const togglePanel = (newState: PanelState, entity: PanelEntity | null, isAddMode: boolean = false) => {
    setAnimatePanelToLeft(true);
    rightSidebar.goTo(newState, {entity, isAddMode});
  };

  const onBackClick = (entity: PanelEntity | null = activeConversation || null) => {
    const previousHistory = rightSidebar.history.slice(0, -1);
    const hasPreviousHistory = !!previousHistory.length;
    setAnimatePanelToLeft(false);

    if (hasPreviousHistory && previousHistory.length === 1 && previousHistory[0] === PanelState.MESSAGE_DETAILS) {
      rightSidebar.goBack(lastViewedMessageDetailsEntity);

      return;
    }

    if (hasPreviousHistory) {
      rightSidebar.goBack(entity);

      return;
    }

    rightSidebar.goTo(PanelState.CONVERSATION_DETAILS, {entity});
  };

  const showDevices = (entity: User) => {
    rightSidebar.goTo(PanelState.PARTICIPANT_DEVICES, {entity});
    setAnimatePanelToLeft(true);
  };

  const switchContent = (newContentState: string) => {
    const isCollectionState = newContentState === ContentState.COLLECTION;

    if (isCollectionState && currentState) {
      closePanel();
    }
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONTENT.SWITCH, switchContent);
    amplify.subscribe(OPEN_CONVERSATION_DETAILS, goToRoot);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, (oldId: string, updatedMessageEntity: Message) => {
      if (currentState === PanelState.MESSAGE_DETAILS && oldId === currentEntity?.id) {
        rightSidebar.updateEntity(updatedMessageEntity);
      }
    });
  }, []);

  const containerRef = useCallback((element: HTMLDivElement | null) => element?.focus(), [currentState]);

  if (!activeConversation) {
    return null;
  }

  return (
    <TransitionGroup
      id="right-column"
      component="aside"
      className="right-column"
      childFactory={child =>
        cloneElement(child, {
          classNames: animatePanelToLeft ? 'right-to-left' : 'left-to-right',
          timeout: rightPanelAnimationTimeout,
        })
      }
    >
      <Animated key={currentState}>
        <>
          {currentState === PanelState.CONVERSATION_DETAILS && (
            <ConversationDetails
              ref={containerRef}
              onClose={closePanel}
              togglePanel={togglePanel}
              activeConversation={activeConversation}
              actionsViewModel={actionsViewModel}
              conversationRepository={conversationRepository}
              integrationRepository={integrationRepository}
              teamRepository={teamRepository}
              teamState={teamState}
              selfUser={selfUser}
              isFederated={isFederated}
            />
          )}

          {currentState === PanelState.GROUP_PARTICIPANT_USER && userEntity && (
            <GroupParticipantUser
              key={userEntity.id}
              onBack={onBackClick}
              onClose={closePanel}
              goToRoot={goToRoot}
              showDevices={showDevices}
              currentUser={userEntity}
              activeConversation={activeConversation}
              actionsViewModel={actionsViewModel}
              conversationRoleRepository={conversationRoleRepository}
              teamRepository={teamRepository}
              teamState={teamState}
              selfUser={selfUser}
              isFederated={isFederated}
            />
          )}

          {currentState === PanelState.NOTIFICATIONS && (
            <Notifications
              activeConversation={activeConversation}
              repositories={repositories}
              onClose={closePanel}
              onGoBack={onBackClick}
            />
          )}

          {currentState === PanelState.PARTICIPANT_DEVICES && userEntity && (
            <ParticipantDevices
              groupId={activeConversation.groupId}
              repositories={repositories}
              onClose={closePanel}
              onGoBack={onBackClick}
              user={userEntity}
            />
          )}

          {currentState === PanelState.TIMED_MESSAGES && (
            <TimedMessages
              teamState={teamState}
              activeConversation={activeConversation}
              repositories={repositories}
              onClose={closePanel}
              onGoBack={onBackClick}
            />
          )}

          {(currentState === PanelState.GUEST_OPTIONS || currentState === PanelState.SERVICES_OPTIONS) && (
            <GuestServicesOptions
              isPasswordSupported={core?.backendFeatures.supportsGuestLinksWithPassword}
              isGuest={currentState === PanelState.GUEST_OPTIONS}
              activeConversation={activeConversation}
              conversationRepository={conversationRepository}
              teamRepository={teamRepository}
              onClose={closePanel}
              onBack={onBackClick}
              teamState={teamState}
            />
          )}

          {currentState === PanelState.GROUP_PARTICIPANT_SERVICE && serviceEntity && userServiceEntity && (
            <GroupParticipantService
              activeConversation={activeConversation}
              actionsViewModel={actionsViewModel}
              integrationRepository={integrationRepository}
              enableRemove={conversationRoleRepository.canRemoveParticipants(activeConversation)}
              goToRoot={goToRoot}
              onBack={onBackClick}
              onClose={closePanel}
              serviceEntity={serviceEntity}
              selfUser={selfUser}
              isAddMode={rightSidebar.isAddMode}
            />
          )}

          {currentState === PanelState.ADD_PARTICIPANTS && (
            <AddParticipants
              activeConversation={activeConversation}
              onBack={onBackClick}
              onClose={closePanel}
              conversationRepository={conversationRepository}
              integrationRepository={integrationRepository}
              searchRepository={searchRepository}
              togglePanel={togglePanel}
              teamRepository={teamRepository}
              teamState={teamState}
              userState={userState}
              selfUser={selfUser}
            />
          )}

          {currentState === PanelState.MESSAGE_DETAILS && messageEntity && (
            <MessageDetails
              activeConversation={activeConversation}
              selfUser={selfUser}
              conversationRepository={conversationRepository}
              messageEntity={messageEntity}
              showReactions={rightSidebar.showReactions}
              userRepository={userRepository}
              onClose={closePanel}
              togglePanel={togglePanel}
            />
          )}

          {currentState === PanelState.CONVERSATION_PARTICIPANTS && (
            <ConversationParticipants
              activeConversation={activeConversation}
              conversationRepository={conversationRepository}
              searchRepository={searchRepository}
              teamRepository={teamRepository}
              togglePanel={togglePanel}
              highlightedUsers={rightSidebar.highlightedUsers || []}
              onBack={onBackClick}
              onClose={closePanel}
            />
          )}

          {currentState === PanelState.ACCESS && (
            <Access
              onClose={closePanel}
              onGoBack={onBackClick}
              activeConversation={activeConversation}
              conversationRepository={conversationRepository}
              conversationRoleRepository={conversationRoleRepository}
            />
          )}
          {currentState === PanelState.CONVERSATION_HISTORY && (
            <ConversationHistory onClose={closePanel} onGoBack={onBackClick} />
          )}
        </>
      </Animated>
    </TransitionGroup>
  );
};

export {RightSidebar};
