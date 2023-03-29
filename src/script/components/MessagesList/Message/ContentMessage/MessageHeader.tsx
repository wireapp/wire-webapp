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

import {AVATAR_SIZE, Avatar} from 'Components/Avatar';
import {Icon} from 'Components/Icon';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {User, PlaceholderUser} from 'src/script/entity/User';
import {ServiceEntity} from 'src/script/integration/ServiceEntity';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

type MessageHeaderParams = {
  sender: User | PlaceholderUser;
  message: ContentMessage;
  onClickAvatar: (user: User | ServiceEntity) => void;
  focusTabIndex?: number;
};

export function MessageHeader({sender, message, onClickAvatar, focusTabIndex}: MessageHeaderParams) {
  const {name: senderName} = useKoSubscribableChildren(sender, ['name']);
  const {was_edited} = useKoSubscribableChildren(message, ['was_edited']);

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

      <div className="message-header-label">
        <h4
          className={`message-header-label-sender ${message.accent_color()}`}
          data-uie-name="sender-name"
          data-uie-uid={sender.id}
        >
          {senderName}
        </h4>

        {sender.isService && (
          <span className="message-header-icon-service">
            <Icon.Service />
          </span>
        )}

        {sender.isExternal() && (
          <span
            className="message-header-icon-external with-tooltip with-tooltip--external"
            data-tooltip={t('rolePartner')}
            data-uie-name="sender-external"
          >
            <Icon.External />
          </span>
        )}

        {sender.isFederated && (
          <span
            className="message-header-icon-guest with-tooltip with-tooltip--external"
            data-tooltip={sender.handle}
            data-uie-name="sender-federated"
          >
            <Icon.Federation />
          </span>
        )}

        {sender.isDirectGuest() && (
          <span
            className="message-header-icon-guest with-tooltip with-tooltip--external"
            data-tooltip={t('conversationGuestIndicator')}
            data-uie-name="sender-guest"
          >
            <Icon.Guest />
          </span>
        )}

        {was_edited && (
          <span className="message-header-label-icon icon-edit" title={message.displayEditedTimestamp()}></span>
        )}
      </div>
    </div>
  );
}
