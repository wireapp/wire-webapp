/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useMemo} from 'react';

import {UserType} from '@wireapp/api-client/lib/user';
import {noop} from 'noop-esm';

import {TabIndex} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/avatar';
import {
  CELLS_SELF_USER_DRIVE_ROLE,
  getSelfUserDriveRole,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {FadingScrollbar} from 'Components/fadingScrollbar';
import * as Icon from 'Components/icon';
import {ParticipantItemContent} from 'Components/participantItemContent';
import {BaseToggle} from 'Components/toggle/BaseToggle';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {capitalizeFirstChar, sortUsersByPriority} from 'Util/stringUtil';

import {
  sharedDriveAvatarCss,
  sharedDriveContainerCss,
  sharedDriveDescriptionCss,
  sharedDriveExternalDescriptionCss,
  sharedDriveInfoCss,
  sharedDriveInfoHeadingCss,
  sharedDriveParticipantItemCss,
  sharedDriveParticipantListCss,
  sharedDriveRoleLabelCss,
  sharedDriveToggleContainerCss,
  sharedDriveViewerRoleCss,
} from './sharedDrive.styles';

import {PanelHeader} from '../panelHeader';

interface SharedDriveProps {
  activeConversation: Conversation;
  onBack: () => void;
  onClose: () => void;
}

const SharedDrive = ({activeConversation, onBack, onClose}: SharedDriveProps) => {
  const {translate} = useApplicationContext();
  const {
    isSelfUserRemoved,
    participating_user_ets: participatingUsers,
    selfUser,
  } = useKoSubscribableChildren(activeConversation, ['isSelfUserRemoved', 'participating_user_ets', 'selfUser']);

  const participants = useMemo(() => {
    const users = participatingUsers.filter(
      (participant): participant is User => participant.type === UserType.REGULAR,
    );

    if (!isSelfUserRemoved && selfUser) {
      return [...users, selfUser].toSorted(sortUsersByPriority);
    }

    return users.toSorted(sortUsersByPriority);
  }, [isSelfUserRemoved, participatingUsers, selfUser]);

  return (
    <div id="shared-drive-settings" className="panel__page shared-drive-settings" css={sharedDriveContainerCss}>
      <PanelHeader
        onGoBack={onBack}
        onClose={onClose}
        goBackUie="go-back-shared-drive"
        title={translate('conversationDetailsActionCellsTitle')}
      />

      <FadingScrollbar className="panel__content">
        <div css={sharedDriveToggleContainerCss}>
          <BaseToggle
            isChecked
            isDisabled
            setIsChecked={noop}
            toggleName={translate('conversationCellsConversationEnabled')}
            infoText={translate('conversationDetailsActionCellsOption')}
            toggleId="shared-drive"
          />
        </div>

        <section css={sharedDriveInfoCss} tabIndex={TabIndex.FOCUSABLE}>
          <h3 className="guest-options__info-head" css={sharedDriveInfoHeadingCss}>
            {translate('cells.sharedDriveAccess.title')}
          </h3>
          <p css={sharedDriveDescriptionCss}>{translate('cells.sharedDriveAccess.description')}</p>
          <p css={sharedDriveExternalDescriptionCss}>{translate('cells.sharedDriveAccess.externalDescription')}</p>
        </section>

        <ul css={sharedDriveParticipantListCss} data-uie-name="list-shared-drive-participants">
          {participants.map(participant => {
            const role = getSelfUserDriveRole({
              conversationTeamId: activeConversation.teamId,
              selfUserTeamId: participant.teamId,
            });
            const roleTranslationKey =
              role === CELLS_SELF_USER_DRIVE_ROLE.EDITOR
                ? 'cells.sharedDriveAccess.role.editor'
                : 'cells.sharedDriveAccess.role.viewer';
            const selfString = participant.isMe
              ? `(${capitalizeFirstChar(translate('conversationYouNominative'))})`
              : '';

            const roleLabel = <span css={sharedDriveRoleLabelCss}>{translate(roleTranslationKey)}</span>;
            const roleWithViewerIcon = (
              <div css={sharedDriveViewerRoleCss}>
                <Icon.GuestIcon data-uie-name="shared-drive-viewer-icon" />
                {roleLabel}
              </div>
            );

            return (
              <li key={participant.id} css={sharedDriveParticipantItemCss}>
                <Avatar
                  avatarSize={AVATAR_SIZE.SMALL}
                  participant={participant}
                  aria-hidden="true"
                  css={sharedDriveAvatarCss}
                />
                <ParticipantItemContent
                  groupId={activeConversation.groupId}
                  participant={participant}
                  shortDescription={participant.handle}
                  selfString={selfString}
                  hasUsernameInfo
                />
                {role === CELLS_SELF_USER_DRIVE_ROLE.VIEWER ? roleWithViewerIcon : roleLabel}
              </li>
            );
          })}
        </ul>
      </FadingScrollbar>
    </div>
  );
};

export {SharedDrive};
