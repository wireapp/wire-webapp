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

import {FC, useState} from 'react';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {toggleFeature} from 'Repositories/conversation/ConversationAccessPermission';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {GuestOptions} from './components/GuestOptions';
import {ServicesOptions} from './components/ServicesOptions';

import {PanelHeader} from '../PanelHeader';

interface GuestServicesOptionsProps {
  activeConversation: Conversation;
  conversationRepository: ConversationRepository;
  teamRepository: TeamRepository;
  onBack: () => void;
  onClose: () => void;
  teamState: TeamState;
  isGuest?: boolean;
  isPasswordSupported?: boolean;
}

const GuestServicesOptions: FC<GuestServicesOptionsProps> = ({
  activeConversation,
  conversationRepository,
  teamRepository,
  onBack,
  onClose,
  teamState,
  isGuest = false,
  isPasswordSupported = false,
}) => {
  const [isRequestOngoing, setIsRequestOngoing] = useState<boolean>(false);

  const {accessState, inTeam, isTeamOnly} = useKoSubscribableChildren(activeConversation, [
    'accessState',
    'inTeam',
    'isTeamOnly',
  ]);

  const {isGuestLinkEnabled: isTeamStateGuestLinkEnabled} = useKoSubscribableChildren(teamState, [
    'isGuestLinkEnabled',
  ]);

  const isToggleDisabled = isRequestOngoing || !inTeam;

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

      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        preventClose: true,
        primaryAction: {
          action: changeAccessState,
          text: t('modalConversationRemoveGuestsOrServicesAction'),
        },
        text: {
          message,
          title: isGuest ? t('modalConversationRemoveGuestsHeadline') : t('modalConversationRemoveServicesHeadline'),
        },
      });
    }
  };

  return (
    <div id={isGuest ? 'guest-options' : 'services-options'} className="panel__page guest-options">
      <PanelHeader
        onGoBack={onBack}
        goBackUie={isGuest ? 'go-back-guest-options' : 'go-back-services-options'}
        onClose={onClose}
        title={isGuest ? t('guestOptionsTitle') : t('servicesOptionsTitle')}
      />

      <FadingScrollbar className="panel__content">
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
            isPasswordSupported={isPasswordSupported}
          />
        ) : (
          <ServicesOptions
            activeConversation={activeConversation}
            toggleAccessState={toggleAccessState}
            isToggleDisabled={isToggleDisabled}
          />
        )}
      </FadingScrollbar>
    </div>
  );
};

export {GuestServicesOptions};
