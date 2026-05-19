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

import is from '@sindresorhus/is';

import {TabIndex} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import * as Icon from 'Components/Icon';
import {ServiceDetails} from 'Components/panel/ServiceDetails';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {TeamRepository} from 'Repositories/team/teamRepository';
import {generatePermissionHelpers} from 'Repositories/user/userPermission';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {handleKeyDown, KEY} from 'Util/keyboardUtil';
import {t} from 'Util/localizerUtil';

import {ActionsViewModel} from '../../../view_model/ActionsViewModel';
import {PanelHeader} from '../panelHeader';

interface GroupParticipantServiceProps {
  activeConversation: Conversation;
  actionsViewModel: ActionsViewModel;
  integrationRepository: IntegrationRepository;
  conversationRepository: ConversationRepository;
  teamRepository: TeamRepository;
  enableRemove: boolean;
  goToRoot: () => void;
  onBack: () => void;
  onClose: () => void;
  serviceEntity: ServiceEntity;
  selfUser: User;
  isAddMode?: boolean;
}

const GroupParticipantService: FC<GroupParticipantServiceProps> = ({
  activeConversation,
  actionsViewModel,
  integrationRepository,
  conversationRepository,
  teamRepository,
  enableRemove,
  goToRoot,
  onBack,
  onClose,
  serviceEntity,
  selfUser,
  isAddMode = false,
}) => {
  const {
    inTeam,
    isActiveParticipant,
    participating_user_ets: participatingUserEts,
  } = useKoSubscribableChildren(activeConversation, ['inTeam', 'isActiveParticipant', 'participating_user_ets']);
  const {teamRole} = useKoSubscribableChildren(selfUser, ['teamRole']);

  const {canChatWithServices} = generatePermissionHelpers(teamRole);

  const serviceUser = participatingUserEts.find(user => {
    if (serviceEntity.isService) {
      return user.serviceId === serviceEntity.id;
    }
    return user.id === serviceEntity.id;
  });

  const showActions = isActiveParticipant && serviceUser !== undefined && inTeam;

  const onOpen = () => {
    actionsViewModel.open1to1ConversationWithService(serviceEntity);
  };

  const onRemove = (user: User) => {
    actionsViewModel.removeFromConversation(activeConversation, user);
    onBack();
  };

  const onAdd = () => {
    if (serviceEntity.isService) {
      integrationRepository.addServiceToExistingConversation(activeConversation, serviceEntity);
    } else if (serviceEntity.qualifiedId !== undefined) {
      conversationRepository.addUsers(activeConversation, [{qualifiedId: serviceEntity.qualifiedId}]);
    }
    goToRoot();
  };

  useEffect(() => {
    integrationRepository.addProviderNameToParticipant(serviceEntity);
  }, [integrationRepository, serviceEntity]);

  useEffect(() => {
    // Set the author of the Service / App to the name of the team the user is in
    if (!is.nullOrUndefined(selfUser.teamId) && serviceEntity.author !== undefined) {
      teamRepository.getTeamNameById(selfUser.teamId).then(name => serviceEntity.author?.(name));
    }
  }, [teamRepository, selfUser.teamId]);

  return (
    <div id="group-participant-service" className="panel__page group-participant">
      <PanelHeader onGoBack={onBack} goBackUie="go-back-group-participant" onClose={onClose} />

      <FadingScrollbar className="panel__content panel__content--fill">
        <ServiceDetails service={serviceEntity} />
      </FadingScrollbar>

      <div className="panel__footer">
        {showActions && (
          <>
            {canChatWithServices?.() === true && (
              <div
                role="button"
                tabIndex={TabIndex.FOCUSABLE}
                className="panel__action-item"
                data-uie-name="go-conversation"
                onClick={onOpen}
                onKeyDown={event =>
                  handleKeyDown({
                    event,
                    callback: onOpen,
                    keys: [KEY.ENTER, KEY.SPACE],
                  })
                }
              >
                <span className="panel__action-item__icon">
                  <Icon.MessageIcon />
                </span>

                <div className="panel__action-item__text">{t('groupParticipantActionOpenConversation')}</div>
              </div>
            )}

            {enableRemove && (
              <div
                role="button"
                tabIndex={TabIndex.FOCUSABLE}
                className="panel__action-item"
                data-uie-name="do-remove"
                onClick={() => {
                  if (serviceUser !== undefined) {
                    onRemove(serviceUser);
                  }
                }}
                onKeyDown={event =>
                  handleKeyDown({
                    event,
                    callback: () => {
                      if (serviceUser !== undefined) {
                        onRemove(serviceUser);
                      }
                    },
                    keys: [KEY.ENTER, KEY.SPACE],
                  })
                }
              >
                <span className="panel__action-item__icon">
                  <Icon.MinusIcon />
                </span>

                <div className="panel__action-item__text">{t('groupParticipantActionRemove')}</div>
              </div>
            )}
          </>
        )}

        {isAddMode && (
          <button
            className="button button-full button-text"
            onClick={onAdd}
            data-uie-name="do-add-service"
            type="button"
          >
            <span>{t('addParticipantsConfirmLabel')}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export {GroupParticipantService};
