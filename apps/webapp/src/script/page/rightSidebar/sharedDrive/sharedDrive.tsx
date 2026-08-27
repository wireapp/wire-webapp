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

import {PanelHeader} from '../panelHeader';

interface SharedDriveProps {
  activeConversation: Conversation;
  onBack: () => void;
  onClose: () => void;
}

const viewerRoleCss = {
  '& > span': {marginLeft: 0},
  alignItems: 'center',
  display: 'flex',
  gap: 8,
  paddingLeft: 8,
};

const roleLabelCss = {
  border: '1px solid var(--gray-40)',
  borderRadius: 8,
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: '14px',
  marginLeft: 8,
  padding: '4px 8px',
};

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
    <div
      id="shared-drive-settings"
      className="panel__page shared-drive-settings"
      css={{
        '& .button-label': {padding: 0, width: 48},
        '& .panel__content > div:first-child': {
          height: 90,
          padding: '16px 8px',
          position: 'relative',
        },
        '& .panel__content > div:first-child::after': {
          backgroundColor: '#CBCED1',
          content: '""',
          height: 1,
          left: 10,
          position: 'absolute',
          top: 73,
          width: 300,
        },
        '& .panel__header': {height: 45, minHeight: 45},
        '& .slider': {width: 48},
        '& .slider.disabled .button-label__switch': {backgroundColor: '#9FA1A7'},
        '& .base-toggle': {borderBottom: 0, marginBottom: 0},
        '& .base-toggle .info-toggle__details': {marginTop: 0, position: 'absolute', top: 36},
      }}
    >
      <PanelHeader
        onGoBack={onBack}
        onClose={onClose}
        goBackUie="go-back-shared-drive"
        title={translate('conversationDetailsActionCellsTitle')}
      />

      <FadingScrollbar className="panel__content">
        <div css={{padding: '16px 8px 8px'}}>
          <BaseToggle
            isChecked
            isDisabled
            setIsChecked={noop}
            toggleName={translate('conversationCellsConversationEnabled')}
            infoText={translate('conversationDetailsActionCellsOption')}
            toggleId="shared-drive"
          />
        </div>

        <section css={{padding: 8}} tabIndex={TabIndex.FOCUSABLE}>
          <h3 className="guest-options__info-head" css={{lineHeight: '20px', margin: 0}}>
            {translate('cells.sharedDriveAccess.title')}
          </h3>
          <p css={{fontSize: 12, lineHeight: '14px', margin: '4px 0 0'}}>
            {translate('cells.sharedDriveAccess.description')}
          </p>
          <p css={{fontSize: 12, lineHeight: '14px', margin: '14px 0 0'}}>
            {translate('cells.sharedDriveAccess.externalDescription')}
          </p>
        </section>

        <ul css={{listStyle: 'none', margin: 0, padding: 0}} data-uie-name="list-shared-drive-participants">
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

            const roleLabel = <span css={roleLabelCss}>{translate(roleTranslationKey)}</span>;
            const roleWithViewerIcon = (
              <div css={viewerRoleCss}>
                <Icon.GuestIcon data-uie-name="shared-drive-viewer-icon" />
                {roleLabel}
              </div>
            );

            return (
              <li
                key={participant.id}
                css={{
                  alignItems: 'center',
                  display: 'flex',
                  minHeight: 56,
                  padding: '8px 8px 8px 0',
                  position: 'relative',
                }}
              >
                <Avatar
                  avatarSize={AVATAR_SIZE.SMALL}
                  participant={participant}
                  aria-hidden="true"
                  css={{margin: '0 20px 0 16px'}}
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
