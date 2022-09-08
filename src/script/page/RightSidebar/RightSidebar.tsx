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

import {FC, useEffect, useState} from 'react';
import {container} from 'tsyringe';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';

import ConversationDetails from './ConversationDetails';

import {ConversationState} from '../../conversation/ConversationState';
import {UserState} from '../../user/UserState';
import {TeamState} from '../../team/TeamState';
import {ContentViewModel} from '../../view_model/ContentViewModel';
import {PanelParams, PanelViewModel} from '../../view_model/PanelViewModel';
import GroupParticipantUser from './GroupParticipantUser';
import {User} from '../../entity/User';
import {isUserEntity} from '../../guards/Panel';
import ParticipantDevices from './ParticipantDevices/ParticipantDevices';
import Notifications from './Notifications/Notifications';
import TimedMessages from './TimedMessages';
import GuestServicesOptions from './GuestServicesOptions/GuestServicesOptions';

const migratedPanels = [
  PanelViewModel.STATE.CONVERSATION_DETAILS,
  PanelViewModel.STATE.GROUP_PARTICIPANT_USER,
  PanelViewModel.STATE.NOTIFICATIONS,
  PanelViewModel.STATE.PARTICIPANT_DEVICES,
  PanelViewModel.STATE.TIMED_MESSAGES,
  PanelViewModel.STATE.GUEST_OPTIONS,
  PanelViewModel.STATE.SERVICES_OPTIONS,
];

interface RightSidebarProps {
  contentViewModel: ContentViewModel;
  teamState: TeamState;
  userState: UserState;
}

const RightSidebar: FC<RightSidebarProps> = ({contentViewModel, teamState, userState}) => {
  const {
    conversation: conversationRepository,
    integration: integrationRepository,
    search: searchRepository,
    team: teamRepository,
  } = contentViewModel.repositories;

  const {conversationRoleRepository} = conversationRepository;

  const {actions: actionsViewModel, panel: panelViewModel} = contentViewModel.mainViewModel;
  const conversationState = container.resolve(ConversationState);

  const {isVisible, state} = useKoSubscribableChildren(panelViewModel, ['isVisible', 'state']);
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);

  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [previousState, setPreviousState] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<string | null>(state);
  const [currentEntity, setCurrentEntity] = useState<PanelParams['entity'] | null>(null);

  const goToRoot = () => {
    if (activeConversation) {
      panelViewModel.goToRoot(PanelViewModel.STATE.CONVERSATION_DETAILS, {entity: activeConversation}, true);
    }
  };

  const togglePanel = (panel: string, params: PanelParams) => {
    const isMigratedPanel = migratedPanels.includes(panel);
    setPreviousState(currentState);
    setCurrentState(isMigratedPanel ? panel : null);
    setCurrentEntity(params.entity);

    panelViewModel.togglePanel(panel, params);
  };

  const onClose = () => {
    panelViewModel.closePanel();
    setCurrentState(null);
    setPreviousState(null);
    setIsMounted(false);
  };

  const backToConversationDetails = () => {
    if (activeConversation) {
      togglePanel(PanelViewModel.STATE.PARTICIPANT_DEVICES, {entity: activeConversation});
      setCurrentState(PanelViewModel.STATE.CONVERSATION_DETAILS);
      setCurrentEntity(activeConversation);
    }
  };

  const showDevices = (entity: User) => {
    togglePanel(PanelViewModel.STATE.PARTICIPANT_DEVICES, {entity});
  };

  const goBackToGroupOrConversationDetails = (entity: User) => {
    const isGroupUserPreviousState = previousState === PanelViewModel.STATE.GROUP_PARTICIPANT_USER;
    const newState = isGroupUserPreviousState
      ? PanelViewModel.STATE.GROUP_PARTICIPANT_USER
      : PanelViewModel.STATE.CONVERSATION_DETAILS;

    togglePanel(newState, {entity});
    setCurrentState(newState);
    setCurrentEntity(entity);
  };

  useEffect(() => {
    if (isVisible && !isMounted) {
      setCurrentState(PanelViewModel.STATE.CONVERSATION_DETAILS);
      setIsMounted(true);
    }
  }, [isMounted, isVisible]);

  useEffect(() => {
    if (isVisible && previousState && migratedPanels.includes(previousState) && activeConversation) {
      // togglePanel(state, {entity: activeConversation});
    }
  }, [isVisible, state, activeConversation, previousState]);

  useEffect(
    () => () => {
      onClose();
    },
    [isVisible],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {currentState === PanelViewModel.STATE.CONVERSATION_DETAILS && activeConversation && (
        <ConversationDetails
          onClose={onClose}
          showDevices={showDevices}
          togglePanel={togglePanel}
          activeConversation={activeConversation}
          actionsViewModel={actionsViewModel}
          conversationRepository={conversationRepository}
          integrationRepository={integrationRepository}
          searchRepository={searchRepository}
          teamRepository={teamRepository}
          teamState={teamState}
          userState={userState}
          isFederated={!!contentViewModel.isFederated}
        />
      )}

      {currentState === PanelViewModel.STATE.GROUP_PARTICIPANT_USER &&
        activeConversation &&
        currentEntity &&
        isUserEntity(currentEntity) && (
          <GroupParticipantUser
            onBack={backToConversationDetails}
            onClose={onClose}
            goToRoot={goToRoot}
            showDevices={showDevices}
            currentUser={currentEntity}
            activeConversation={activeConversation}
            actionsViewModel={actionsViewModel}
            conversationRoleRepository={conversationRoleRepository}
            teamRepository={teamRepository}
            teamState={teamState}
            userState={userState}
            isFederated={!!contentViewModel.isFederated}
          />
        )}

      {currentState === PanelViewModel.STATE.NOTIFICATIONS && activeConversation && (
        <Notifications
          activeConversation={activeConversation}
          repositories={contentViewModel.repositories}
          onClose={onClose}
          onGoBack={backToConversationDetails}
        />
      )}

      {currentState === PanelViewModel.STATE.PARTICIPANT_DEVICES && currentEntity && isUserEntity(currentEntity) && (
        <ParticipantDevices
          repositories={contentViewModel.repositories}
          onClose={onClose}
          onGoBack={goBackToGroupOrConversationDetails}
          user={currentEntity}
        />
      )}

      {currentState === PanelViewModel.STATE.TIMED_MESSAGES && activeConversation && (
        <TimedMessages
          activeConversation={activeConversation}
          repositories={contentViewModel.repositories}
          onClose={onClose}
          onGoBack={backToConversationDetails}
        />
      )}

      {(currentState === PanelViewModel.STATE.GUEST_OPTIONS ||
        currentState === PanelViewModel.STATE.SERVICES_OPTIONS) &&
        activeConversation && (
          <GuestServicesOptions
            isGuest={currentState === PanelViewModel.STATE.GUEST_OPTIONS}
            activeConversation={activeConversation}
            conversationRepository={conversationRepository}
            teamRepository={teamRepository}
            onClose={onClose}
            onBack={backToConversationDetails}
            teamState={teamState}
          />
        )}
    </>
  );
};

export default RightSidebar;

registerReactComponent('right-sidebar', RightSidebar);
