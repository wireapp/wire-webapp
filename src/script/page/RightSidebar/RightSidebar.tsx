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
import {FC, ReactNode, cloneElement, useEffect, useState} from 'react';
import {CSSTransition, TransitionGroup} from 'react-transition-group';
import {container} from 'tsyringe';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import AddParticipants from './AddParticipants';
import ConversationDetails from './ConversationDetails';
import ConversationParticipants from './ConversationParticipants';
import GuestServicesOptions from './GuestServicesOptions';
import GroupParticipantUser from './GroupParticipantUser';
import GroupParticipantService from './GroupParticipantService';
import MessageDetails from './MessageDetails';
import Notifications from './Notifications';
import ParticipantDevices from './ParticipantDevices';
import TimedMessages from './TimedMessages';

import toggleRightSidebar from './utils/toggleRightPanel';
import usePanelHistory from './utils/usePanelHistory';

import {ConversationState} from '../../conversation/ConversationState';
import {Conversation} from '../../entity/Conversation';
import {Message} from '../../entity/message/Message';
import {User} from '../../entity/User';
import {isContentMessage} from '../../guards/Message';
import {isUserEntity, isUserServiceEntity} from '../../guards/Panel';
import {isServiceEntity} from '../../guards/Service';
import {ServiceEntity} from '../../integration/ServiceEntity';
import {UserState} from '../../user/UserState';
import {TeamState} from '../../team/TeamState';
import {ContentViewModel} from '../../view_model/ContentViewModel';
import {MainViewModel, ViewModelRepositories} from '../../view_model/MainViewModel';

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
}

export type PanelEntity = Conversation | User | Message | ServiceEntity;

interface RightSidebarProps {
  initialState: PanelState;
  initialEntity: PanelEntity | null;
  mainViewModel: MainViewModel;
  repositories: ViewModelRepositories;
  teamState: TeamState;
  userState: UserState;
  highlighted?: User[];
  showLikes?: boolean;
  isFederated?: boolean;
  onClose?: () => void;
}

const RightSidebar: FC<RightSidebarProps> = ({
  initialState,
  initialEntity,
  mainViewModel,
  repositories,
  teamState,
  userState,
  highlighted = [],
  showLikes = false,
  isFederated = false,
  onClose: onPanelClose,
}) => {
  const {
    conversation: conversationRepository,
    integration: integrationRepository,
    search: searchRepository,
    team: teamRepository,
    user: userRepository,
  } = repositories;
  const {conversationRoleRepository} = conversationRepository;
  const {actions: actionsViewModel} = mainViewModel;
  const conversationState = container.resolve(ConversationState);

  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);

  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const [currentEntity, setCurrentEntity] = useState<PanelEntity | null>(initialEntity);
  const [animatePanelToLeft, setAnimatePanelToLeft] = useState<boolean>(true);

  const {currentState, goBack, goTo, clearHistory} = usePanelHistory(initialState);

  const userEntity = currentEntity && isUserEntity(currentEntity) ? currentEntity : null;
  const userServiceEntity = currentEntity && isUserServiceEntity(currentEntity) ? currentEntity : null;
  const messageEntity = currentEntity && isContentMessage(currentEntity) ? currentEntity : null;
  const serviceEntity = currentEntity && isServiceEntity(currentEntity) ? currentEntity : null;

  const goToRoot = () => {
    setCurrentEntity(activeConversation);
    clearHistory();
  };

  const closePanel = () => {
    onPanelClose?.();
    setCurrentEntity(null);
  };

  const togglePanel = (newState: PanelState, entity: PanelEntity | null, addMode: boolean = false) => {
    setAnimatePanelToLeft(true);
    goTo(newState);
    setCurrentEntity(entity);
    setIsAddMode(addMode);
  };

  const onBackClick = (entity: PanelEntity | null = activeConversation) => {
    setCurrentEntity(entity);
    goBack();
    setAnimatePanelToLeft(false);
  };

  const showDevices = (entity: User) => {
    setCurrentEntity(entity);
    goTo(PanelState.PARTICIPANT_DEVICES);
    setAnimatePanelToLeft(true);
  };

  const switchContent = (newContentState: string) => {
    const isCollectionState = newContentState === ContentViewModel.STATE.COLLECTION;

    if (isCollectionState && currentState) {
      closePanel();
    }
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONTENT.SWITCH, switchContent);
    amplify.subscribe(OPEN_CONVERSATION_DETAILS, goToRoot);

    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, (oldId: string, updatedMessageEntity: Message) => {
      if (currentState === PanelState.MESSAGE_DETAILS && oldId === currentEntity?.id) {
        setCurrentEntity(updatedMessageEntity);
      }
    });
  }, []);

  if (!activeConversation) {
    return null;
  }

  return (
    <TransitionGroup
      style={{height: '100%'}}
      childFactory={child =>
        cloneElement(child, {
          classNames: animatePanelToLeft ? 'right-to-left' : 'left-to-right',
          timeout: rightPanelAnimationTimeout,
        })
      }
    >
      {currentState === PanelState.CONVERSATION_DETAILS && (
        <Animated key={PanelState.CONVERSATION_DETAILS}>
          <ConversationDetails
            onClose={closePanel}
            togglePanel={togglePanel}
            activeConversation={activeConversation}
            actionsViewModel={actionsViewModel}
            conversationRepository={conversationRepository}
            integrationRepository={integrationRepository}
            searchRepository={searchRepository}
            teamRepository={teamRepository}
            teamState={teamState}
            userState={userState}
            isFederated={isFederated}
          />
        </Animated>
      )}

      {currentState === PanelState.GROUP_PARTICIPANT_USER && userEntity && (
        <Animated key={PanelState.GROUP_PARTICIPANT_USER}>
          <GroupParticipantUser
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
            userState={userState}
            isFederated={isFederated}
          />
        </Animated>
      )}

      {currentState === PanelState.NOTIFICATIONS && (
        <Animated key={PanelState.NOTIFICATIONS}>
          <Notifications
            activeConversation={activeConversation}
            repositories={repositories}
            onClose={closePanel}
            onGoBack={onBackClick}
          />
        </Animated>
      )}

      {currentState === PanelState.PARTICIPANT_DEVICES && userEntity && (
        <Animated key={PanelState.PARTICIPANT_DEVICES}>
          <ParticipantDevices
            repositories={repositories}
            onClose={closePanel}
            onGoBack={onBackClick}
            user={userEntity}
          />
        </Animated>
      )}

      {currentState === PanelState.TIMED_MESSAGES && (
        <Animated key={PanelState.TIMED_MESSAGES}>
          <TimedMessages
            activeConversation={activeConversation}
            repositories={repositories}
            onClose={closePanel}
            onGoBack={onBackClick}
          />
        </Animated>
      )}

      {currentState === PanelState.GUEST_OPTIONS && (
        <Animated key={PanelState.GUEST_OPTIONS}>
          <GuestServicesOptions
            isGuest
            activeConversation={activeConversation}
            conversationRepository={conversationRepository}
            teamRepository={teamRepository}
            onClose={closePanel}
            onBack={onBackClick}
            teamState={teamState}
          />
        </Animated>
      )}

      {currentState === PanelState.SERVICES_OPTIONS && (
        <Animated key={PanelState.SERVICES_OPTIONS}>
          <GuestServicesOptions
            isGuest={false}
            activeConversation={activeConversation}
            conversationRepository={conversationRepository}
            teamRepository={teamRepository}
            onClose={closePanel}
            onBack={onBackClick}
            teamState={teamState}
          />
        </Animated>
      )}

      {currentState === PanelState.GROUP_PARTICIPANT_SERVICE && serviceEntity && userServiceEntity && (
        <Animated key={PanelState.GROUP_PARTICIPANT_SERVICE}>
          <GroupParticipantService
            activeConversation={activeConversation}
            actionsViewModel={actionsViewModel}
            integrationRepository={integrationRepository}
            goToRoot={goToRoot}
            onBack={onBackClick}
            onClose={closePanel}
            serviceEntity={serviceEntity}
            userEntity={userServiceEntity}
            userState={userState}
            isAddMode={isAddMode}
          />
        </Animated>
      )}

      {currentState === PanelState.ADD_PARTICIPANTS && (
        <Animated key={PanelState.ADD_PARTICIPANTS}>
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
          />
        </Animated>
      )}

      {currentState === PanelState.MESSAGE_DETAILS && messageEntity && (
        <Animated key={PanelState.MESSAGE_DETAILS}>
          <MessageDetails
            activeConversation={activeConversation}
            conversationRepository={conversationRepository}
            messageEntity={messageEntity}
            updateEntity={setCurrentEntity}
            teamRepository={teamRepository}
            searchRepository={searchRepository}
            showLikes={showLikes}
            userRepository={userRepository}
            onClose={closePanel}
          />
        </Animated>
      )}

      {currentState === PanelState.CONVERSATION_PARTICIPANTS && (
        <Animated key={PanelState.CONVERSATION_PARTICIPANTS}>
          <ConversationParticipants
            activeConversation={activeConversation}
            conversationRepository={conversationRepository}
            searchRepository={searchRepository}
            teamRepository={teamRepository}
            togglePanel={togglePanel}
            highlightedUsers={highlighted}
            onBack={onBackClick}
            onClose={closePanel}
          />
        </Animated>
      )}
    </TransitionGroup>
  );
};

export default RightSidebar;

export const openRightSidebar = toggleRightSidebar<RightSidebarProps>(RightSidebar);
