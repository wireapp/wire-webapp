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

import {DefaultConversationRoleName as DefaultRole} from '@wireapp/api-client/lib/conversation/';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Icon} from 'Components/Icon';
import {EnrichedFields} from 'Components/panel/EnrichedFields';
import {UserActions, Actions} from 'Components/panel/UserActions';
import {UserDetails} from 'Components/panel/UserDetails';
import {BaseToggle} from 'Components/toggle/BaseToggle';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {ConversationRoleRepository} from '../../../conversation/ConversationRoleRepository';
import {MemberLeaveEvent, TeamMemberLeaveEvent} from '../../../conversation/EventBuilder';
import {Conversation} from '../../../entity/Conversation';
import {User} from '../../../entity/User';
import {ClientEvent} from '../../../event/Client';
import {TeamRepository} from '../../../team/TeamRepository';
import {TeamState} from '../../../team/TeamState';
import {UserState} from '../../../user/UserState';
import {ActionsViewModel} from '../../../view_model/ActionsViewModel';
import {PanelHeader} from '../PanelHeader';
import {PanelEntity} from '../RightSidebar';

interface GroupParticipantUserProps {
  onBack: (entity: PanelEntity) => void;
  onClose: () => void;
  showDevices: (entity: User) => void;
  goToRoot: () => void;
  currentUser: User;
  actionsViewModel: ActionsViewModel;
  activeConversation: Conversation;
  conversationRoleRepository: ConversationRoleRepository;
  teamRepository: TeamRepository;
  teamState: TeamState;
  userState: UserState;
  isFederated?: boolean;
}

const GroupParticipantUser: FC<GroupParticipantUserProps> = ({
  onBack,
  onClose,
  goToRoot,
  showDevices,
  currentUser,
  actionsViewModel,
  activeConversation,
  conversationRoleRepository,
  teamRepository,
  teamState,
  userState,
  isFederated = false,
}) => {
  const {isGroup, roles} = useKoSubscribableChildren(activeConversation, ['isGroup', 'roles']);
  const {isTemporaryGuest, isAvailable} = useKoSubscribableChildren(currentUser, ['isTemporaryGuest', 'isAvailable']);
  const {classifiedDomains, isTeam, team} = useKoSubscribableChildren(teamState, [
    'classifiedDomains',
    'isTeam',
    'team',
  ]);
  const {isActivatedAccount, self: selfUser} = useKoSubscribableChildren(userState, ['isActivatedAccount', 'self']);
  const {is_verified: isSelfVerified} = useKoSubscribableChildren(selfUser, ['is_verified']);

  const canChangeRole =
    conversationRoleRepository.canChangeParticipantRoles(activeConversation) && !currentUser.isMe && !isTemporaryGuest;

  const isAdmin = isGroup && conversationRoleRepository.isUserGroupAdmin(activeConversation, currentUser);

  const toggleAdmin = async () => {
    if (currentUser.isFederated) {
      return;
    }

    const newRole = isAdmin ? DefaultRole.WIRE_MEMBER : DefaultRole.WIRE_ADMIN;
    await conversationRoleRepository.setMemberConversationRole(activeConversation, currentUser.id, newRole);

    roles[currentUser.id] = newRole;
    activeConversation.roles(roles);
  };

  const onUserAction = (action: Actions) => {
    if (action === Actions.REMOVE) {
      onBack(activeConversation);
    }
  };

  const checkMemberLeave = ({type, data}: MemberLeaveEvent | TeamMemberLeaveEvent) => {
    if (type === ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE && data.user_ids.includes(currentUser.id)) {
      goToRoot();
    }
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, checkMemberLeave);
  }, []);

  useEffect(() => {
    if (currentUser.isDeleted) {
      goToRoot();
    }
  }, [currentUser]);

  useEffect(() => {
    if (isTeam) {
      teamRepository.updateTeamMembersByIds(team, [currentUser.id], true);
    }
  }, [isTeam, currentUser, teamRepository, team]);

  useEffect(() => {
    if (isTemporaryGuest) {
      currentUser.checkGuestExpiration();
    }
  }, [isTemporaryGuest, currentUser]);

  return (
    <div id="group-participant-user" className="panel__page group-participant">
      <PanelHeader
        showBackArrow
        goBackUie="go-back-group-participant"
        onGoBack={() => onBack(activeConversation)}
        onClose={onClose}
      />

      <FadingScrollbar className="panel__content">
        <UserDetails
          conversationDomain={activeConversation.domain}
          participant={currentUser}
          badge={teamRepository.getRoleBadge(currentUser.id)}
          isGroupAdmin={isAdmin}
          isSelfVerified={isSelfVerified}
          classifiedDomains={classifiedDomains}
        />

        {!currentUser.isMe && isAvailable && (
          <div className="conversation-details__devices">
            <button
              className="panel__action-item"
              onClick={() => showDevices(currentUser)}
              aria-label={t('accessibility.conversationDetailsActionDevicesLabel')}
              data-uie-name="go-devices"
              type="button"
            >
              <span className="panel__action-item__icon">
                <Icon.Devices />
              </span>

              <span className="panel__action-item__text">{t('conversationDetailsActionDevices')}</span>

              <Icon.ChevronRight className="chevron-right-icon" />
            </button>
          </div>
        )}

        {canChangeRole && isAvailable && (
          <>
            <div className="conversation-details__admin">
              <div
                tabIndex={TabIndex.FOCUSABLE}
                role="button"
                className="panel__action-item modal-style panel__action-button"
                data-uie-name="toggle-admin"
                aria-label={t('accessibility.conversationDetailsActionGroupAdminLabel')}
                aria-pressed={isAdmin}
                onClick={toggleAdmin}
                onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => handleKeyDown(event, toggleAdmin)}
              >
                <span className="panel__action-item__icon">
                  <Icon.GroupAdmin />
                </span>

                <BaseToggle
                  isChecked={isAdmin}
                  setIsChecked={toggleAdmin}
                  toggleName={t('conversationDetailsGroupAdmin')}
                  toggleId="admin"
                  isDisabled={currentUser.isFederated}
                />
              </div>
            </div>

            <p className="panel__info-text panel__item-offset" css={{padding: '16px'}} tabIndex={TabIndex.FOCUSABLE}>
              {t('conversationDetailsGroupAdminInfo')}
            </p>
          </>
        )}

        {!isTemporaryGuest && <EnrichedFields user={currentUser} showDomain={isFederated} />}

        <UserActions
          user={currentUser}
          conversation={activeConversation}
          actionsViewModel={actionsViewModel}
          onAction={onUserAction}
          isSelfActivated={isActivatedAccount}
          conversationRoleRepository={conversationRoleRepository}
          selfUser={selfUser}
        />
      </FadingScrollbar>
    </div>
  );
};

export {GroupParticipantUser};
