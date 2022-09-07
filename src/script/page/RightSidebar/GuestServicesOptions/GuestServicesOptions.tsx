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
import {FC, useState} from 'react';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import PanelHeader from '../PanelHeader';

import GuestOptions from './components/GuestOptions';
import ServicesOptions from './components/ServicesOptions';

import {toggleFeature} from '../../../conversation/ConversationAccessPermission';
import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {Conversation} from '../../../entity/Conversation';
import {TeamRepository} from '../../../team/TeamRepository';
import {TeamState} from '../../../team/TeamState';
import {ModalsViewModel} from '../../../view_model/ModalsViewModel';

interface GuestServicesOptionsProps {
  activeConversation: Conversation;
  conversationRepository: ConversationRepository;
  teamRepository: TeamRepository;
  onBack: () => void;
  onClose: () => void;
  teamState: TeamState;
  isGuest?: boolean;
}

// STATE.GUEST_OPTIONS
const GuestServicesOptions: FC<GuestServicesOptionsProps> = ({
  activeConversation,
  conversationRepository,
  teamRepository,
  onBack,
  onClose,
  teamState,
  isGuest = false,
}) => {
  // TODO: It's needed here?
  // getLogger('GuestsAndServicesViewModel')
  const [isRequestOngoing, setIsRequestOngoing] = useState<boolean>(false);

  const {accessState, inTeam, isTeamOnly} = useKoSubscribableChildren(activeConversation, [
    'accessState',
    'inTeam',
    'isTeamOnly',
  ]);

  const isToggleDisabled = isRequestOngoing || !inTeam;

  const {isGuestLinkEnabled: isTeamStateGuestLinkEnabled} = useKoSubscribableChildren(teamState, [
    'isGuestLinkEnabled',
  ]);

  const toggleAccessState = async (feature: number, message: string, willAffectMembers: boolean) => {
    if (inTeam) {
      const newAccessState = toggleFeature(feature, accessState);

      const changeAccessState = async () => {
        if (!isRequestOngoing) {
          setIsRequestOngoing(true);
          await conversationRepository.stateHandler.changeAccessState(activeConversation, newAccessState);
          setIsRequestOngoing(false);
        }
      };

      if (isTeamOnly || !willAffectMembers) {
        return changeAccessState();
      }

      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        preventClose: true,
        primaryAction: {
          action: changeAccessState,
          text: t('modalConversationRemoveAction'),
        },
        text: {
          message,
          title: t('modalConversationRemoveGuestsAndServicesHeadline'),
        },
      });
    }
  };

  return (
    <div id={isGuest ? 'guest-options' : 'services-options'} className="panel__page guest-options panel__page--visible">
      <PanelHeader
        onGoBack={onBack}
        goBackUie={isGuest ? 'go-back-guest-options' : 'go-back-services-options'}
        onClose={onClose}
        title={isGuest ? t('guestOptionsTitle') : t('servicesOptionsTitle')}
      />

      <div className="panel__content" data-bind="fadingscrollbar">
        {isGuest ? (
          <GuestOptions
            activeConversation={activeConversation}
            conversationRepository={conversationRepository}
            teamRepository={teamRepository}
            toggleAccessState={toggleAccessState}
            isTeamStateGuestLinkEnabled={isTeamStateGuestLinkEnabled}
            isRequestOngoing={isRequestOngoing}
            setIsRequestOngoing={setIsRequestOngoing}
            isToggleDisabled={isToggleDisabled}
          />
        ) : (
          <ServicesOptions
            activeConversation={activeConversation}
            toggleAccessState={toggleAccessState}
            isToggleDisabled={isToggleDisabled}
          />
        )}
      </div>
    </div>
  );
};

export default GuestServicesOptions;
