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

import {FC, useEffect} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Icon} from 'Components/Icon';
import {ServiceDetails} from 'Components/panel/ServiceDetails';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {Conversation} from '../../../entity/Conversation';
import {User} from '../../../entity/User';
import {IntegrationRepository} from '../../../integration/IntegrationRepository';
import {ServiceEntity} from '../../../integration/ServiceEntity';
import {generatePermissionHelpers} from '../../../user/UserPermission';
import {ActionsViewModel} from '../../../view_model/ActionsViewModel';
import {PanelHeader} from '../PanelHeader';

interface GroupParticipantServiceProps {
  activeConversation: Conversation;
  actionsViewModel: ActionsViewModel;
  integrationRepository: IntegrationRepository;
  goToRoot: () => void;
  onBack: () => void;
  onClose: () => void;
  serviceEntity: ServiceEntity;
  userEntity: User;
  selfUser: User;
  isAddMode?: boolean;
}

const GroupParticipantService: FC<GroupParticipantServiceProps> = ({
  activeConversation,
  actionsViewModel,
  integrationRepository,
  goToRoot,
  onBack,
  onClose,
  serviceEntity,
  userEntity,
  selfUser,
  isAddMode = false,
}) => {
  const {
    inTeam,
    isActiveParticipant,
    participating_user_ids: participatingUserIds,
  } = useKoSubscribableChildren(activeConversation, ['inTeam', 'isActiveParticipant', 'participating_user_ids']);
  const {teamRole} = useKoSubscribableChildren(selfUser, ['teamRole']);

  const {canChatWithServices, canUpdateGroupParticipants} = generatePermissionHelpers(teamRole);

  const selectedInConversation = participatingUserIds.some(user => matchQualifiedIds(userEntity, user));

  const showActions = isActiveParticipant && selectedInConversation && inTeam;

  const onOpen = () => {
    actionsViewModel.open1to1ConversationWithService(serviceEntity);
  };

  const onRemove = () => {
    actionsViewModel.removeFromConversation(activeConversation, userEntity);
    onBack();
  };

  const onAdd = () => {
    integrationRepository.addService(activeConversation, serviceEntity);
    goToRoot();
  };

  useEffect(() => {
    integrationRepository.addProviderNameToParticipant(serviceEntity);
  }, [integrationRepository, serviceEntity]);

  return (
    <div id="group-participant-service" className="panel__page group-participant">
      <PanelHeader onGoBack={onBack} goBackUie="go-back-group-participant" onClose={onClose} />

      <FadingScrollbar className="panel__content panel__content--fill">
        <ServiceDetails service={serviceEntity} />

        {showActions && canChatWithServices() && (
          <div
            role="button"
            tabIndex={TabIndex.FOCUSABLE}
            className="panel__action-item"
            data-uie-name="go-conversation"
            onClick={onOpen}
            onKeyDown={event => handleKeyDown(event, onOpen)}
          >
            <span className="panel__action-item__icon">
              <Icon.Message />
            </span>

            <div className="panel__action-item__text">{t('groupParticipantActionOpenConversation')}</div>
          </div>
        )}

        {showActions && canUpdateGroupParticipants() && (
          <div
            role="button"
            tabIndex={TabIndex.FOCUSABLE}
            className="panel__action-item"
            data-uie-name="do-remove"
            onClick={onRemove}
            onKeyDown={event => handleKeyDown(event, onRemove)}
          >
            <span className="panel__action-item__icon">
              <Icon.Minus />
            </span>

            <div className="panel__action-item__text">{t('groupParticipantActionRemove')}</div>
          </div>
        )}
      </FadingScrollbar>

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

export {GroupParticipantService};
