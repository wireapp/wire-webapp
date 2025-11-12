/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Tooltip} from '@wireapp/react-ui-kit';

import {AVATAR_SIZE, Avatar} from 'Components/Avatar';
import {UserBlockedBadge} from 'Components/Badge';
import * as Icon from 'Components/Icon';
import {UserName} from 'Components/UserName';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {DeleteMessage} from 'Repositories/entity/message/DeleteMessage';
import {User} from 'Repositories/entity/User';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {headerIconBadge, headerLabelBadge, headerIconSizeM, headerIconSizeS} from './MessageHeader.styles';

type MessageHeaderParams = {
  message: ContentMessage | DeleteMessage;
  onClickAvatar: (user: User | ServiceEntity) => void;
  focusTabIndex?: number;
  /** Will not display the guest, federated or service badges next to the user name */
  noBadges?: boolean;
  /** Will not use the user's accent color to display the user name */
  noColor?: boolean;
  uieName?: string;
  children?: React.ReactNode;
};

function BadgeSection({sender}: {sender: User}) {
  return (
    <>
      {sender.isService && (
        <span className="message-header-icon-service" css={headerIconBadge}>
          <Icon.ServiceIcon css={headerIconSizeS} />
        </span>
      )}

      {sender.isExternal() && (
        <Tooltip
          body={t('rolePartner')}
          data-uie-name="sender-external"
          className="message-header-icon-external"
          css={headerIconBadge}
        >
          <Icon.ExternalIcon css={headerIconSizeM} />
        </Tooltip>
      )}

      {sender.isFederated && (
        <Tooltip
          className="message-header-icon-guest"
          body={sender.handle}
          data-uie-name="sender-federated"
          css={headerIconBadge}
        >
          <Icon.FederationIcon css={headerIconSizeM} />
        </Tooltip>
      )}

      {sender.isDeleted && (
        <p data-uie-name="sender-deleted" css={headerLabelBadge}>
          {t('deletedUserBadge')}
        </p>
      )}

      {sender.isDirectGuest() && !sender.isFederated && (
        <Tooltip
          className="message-header-icon-guest"
          body={t('conversationGuestIndicator')}
          data-uie-name="sender-guest"
          css={headerIconBadge}
        >
          <Icon.GuestIcon css={headerIconSizeS} />
        </Tooltip>
      )}
    </>
  );
}

export function MessageHeader({
  message,
  onClickAvatar,
  focusTabIndex,
  noBadges = false,
  noColor = false,
  uieName = '',
  children,
}: MessageHeaderParams) {
  const {user: sender} = useKoSubscribableChildren(message, ['user']);
  const {isAvailable, isBlocked} = useKoSubscribableChildren(sender, ['isAvailable', 'isBlocked']);

  return (
    <div className="message-header">
      <div className="message-header-icon">
        <Avatar
          tabIndex={focusTabIndex}
          participant={sender}
          onAvatarClick={onClickAvatar}
          avatarSize={AVATAR_SIZE.X_SMALL}
        />
      </div>

      <div className="message-header-label" data-uie-name={uieName}>
        <h4
          className={`message-header-label-sender ${!noColor && message.accent_color()}`}
          css={!isAvailable ? {color: 'var(--text-input-placeholder)'} : {}}
          data-uie-name={uieName ? `${uieName}-sender-name` : 'sender-name'}
          data-uie-uid={sender.id}
        >
          <UserName user={sender} />
        </h4>

        {isBlocked && (
          <span css={{marginLeft: 4}}>
            <UserBlockedBadge />
          </span>
        )}

        {!noBadges && <BadgeSection sender={sender} />}

        {children}
      </div>
    </div>
  );
}
