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

import {FC, useCallback, useEffect, useState} from 'react';

import Icon from 'Components/Icon';
import ServiceDetails from 'Components/panel/ServiceDetails';

import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import PanelHeader from '../PanelHeader';

import {UserState} from '../../../user/UserState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {generatePermissionHelpers} from '../../../user/UserPermission';
import {Conversation} from '../../../entity/Conversation';
import {ActionsViewModel} from '../../../view_model/ActionsViewModel';
import {IntegrationRepository} from '../../../integration/IntegrationRepository';
import {User} from '../../../entity/User';
import {ServiceEntity} from '../../../integration/ServiceEntity';
import {handleKeyDown} from 'Util/KeyboardUtil';

interface GroupParticipantServiceProps {
  activeConversation: Conversation;
  actionsViewModel: ActionsViewModel;
  integrationRepository: IntegrationRepository;
  onBack: () => void;
  onClose: () => void;
  userEntity: User;
  userState: UserState;
  isAddMode?: boolean;
}

const GroupParticipantService: FC<GroupParticipantServiceProps> = ({
  activeConversation,
  actionsViewModel,
  integrationRepository,
  onBack,
  onClose,
  userEntity,
  userState,
  isAddMode = false,
}) => {
  // TODO: Should be added (?)
  // getLogger('GroupParticipantServiceViewModel');
  const [selectedService, setSelectedService] = useState<ServiceEntity | null>(null);

  const {
    inTeam,
    isActiveParticipant,
    participating_user_ids: participatingUserIds,
  } = useKoSubscribableChildren(activeConversation, ['inTeam', 'isActiveParticipant', 'participating_user_ids']);
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);
  const {teamRole} = useKoSubscribableChildren(selfUser, ['teamRole']);

  const {canChatWithServices, canUpdateGroupParticipants} = generatePermissionHelpers(teamRole);

  const selectedInConversation = participatingUserIds.some(user => matchQualifiedIds(userEntity, user));

  const showActions = isActiveParticipant && selectedInConversation && inTeam;

  const onOpen = () => {
    if (selectedService) {
      actionsViewModel.open1to1ConversationWithService(selectedService);
    }
  };

  const onRemove = () => {
    actionsViewModel.removeFromConversation(activeConversation, userEntity);
    // this.onGoBack();
  };

  const onAdd = () => {
    if (selectedService) {
      integrationRepository.addService(activeConversation, selectedService);
      // this.onGoToRoot();
    }
  };

  const showService = useCallback(async () => {
    const serviceEntity = await integrationRepository.getServiceFromUser(userEntity);

    if (!serviceEntity) {
      return;
    }

    setSelectedService(serviceEntity);
    integrationRepository.addProviderNameToParticipant(serviceEntity);
  }, [userEntity]);

  useEffect(() => {
    showService();
  }, [showService]);

  return (
    <div id="group-participant-service" className="panel__page group-participant panel__page--visible">
      <PanelHeader onGoBack={onBack} goBackUie="go-back-group-participant" onClose={onClose} />

      <div className="panel__content panel__content--fill" data-bind="fadingscrollbar">
        {selectedService && (
          <>
            <ServiceDetails service={selectedService} />

            {showActions && canChatWithServices() && (
              <div
                role="button"
                tabIndex={0}
                className="panel__action-item"
                data-uie-name="go-conversation"
                onClick={onOpen}
                onKeyDown={event => handleKeyDown(event, onOpen)}
              >
                <Icon.Message className="panel__action-item__icon" />

                <div className="panel__action-item__text">{t('groupParticipantActionOpenConversation')}</div>
              </div>
            )}

            {showActions && canUpdateGroupParticipants() && (
              <div
                role="button"
                tabIndex={0}
                className="panel__action-item"
                data-uie-name="do-remove"
                onClick={onRemove}
                onKeyDown={event => handleKeyDown(event, onRemove)}
              >
                <Icon.Minus className="panel__action-item__icon" />

                <div className="panel__action-item__text">{t('groupParticipantActionRemove')}</div>
              </div>
            )}
          </>
        )}
      </div>

      {isAddMode && (
        <div className="panel__footer">
          <button className="button button-full" onClick={onAdd} data-uie-name="do-add-service" type="button">
            <span>{t('addParticipantsConfirmLabel')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GroupParticipantService;
