/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import * as Icon from 'Components/Icon';
import {MemberMessage as MemberMessageEntity} from 'Repositories/entity/message/MemberMessage';
import {User} from 'Repositories/entity/User';
import {SystemMessageType} from 'src/script/message/SystemMessageType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {Button, ButtonVariant, CollectionIcon} from '@wireapp/react-ui-kit';

import {E2eEncryptionMessage} from './E2eEncryptionMessage/E2eEncryptionMessage';
import {ConnectedMessage} from './MemberMessage/ConnectedMessage';
import {MessageContent} from './MemberMessage/MessageContent';
import {MessageTime} from './MessageTime';

interface MemberMessageProps {
  classifiedDomains?: string[];
  hasReadReceiptsTurnedOn: boolean;
  isSelfTemporaryGuest: boolean;
  message: MemberMessageEntity;
  onClickCancelRequest: (message: MemberMessageEntity) => void;
  onClickInvitePeople: () => void;
  onClickParticipants: (participants: User[]) => void;
  shouldShowInvitePeople: boolean;
  conversationName: string;
  isCellsConversation: boolean;
}

export const MemberMessage = ({
  message,
  shouldShowInvitePeople,
  isSelfTemporaryGuest,
  hasReadReceiptsTurnedOn,
  onClickInvitePeople,
  onClickParticipants,
  onClickCancelRequest,
  classifiedDomains,
  conversationName,
  isCellsConversation,
}: MemberMessageProps) => {
  const {otherUser, timestamp, user, htmlGroupCreationHeader, showNamedCreation, hasUsers} = useKoSubscribableChildren(
    message,
    ['otherUser', 'timestamp', 'user', 'htmlGroupCreationHeader', 'showNamedCreation', 'hasUsers'],
  );

  const isGroupCreation = message.isGroupCreation();
  const isMemberRemoval = message.isMemberRemoval();
  const isMemberJoin = message.isMemberJoin();
  const isMemberLeave = message.isMemberLeave();
  const isMemberChange = message.isMemberChange();

  const isConnectedMessage = [SystemMessageType.CONNECTION_ACCEPTED, SystemMessageType.CONNECTION_REQUEST].includes(
    message.memberMessageType,
  );

  if (isConnectedMessage) {
    return (
      <ConnectedMessage
        user={otherUser}
        showServicesWarning={message.showServicesWarning}
        onClickCancelRequest={() => onClickCancelRequest(message)}
        classifiedDomains={classifiedDomains}
      />
    );
  }

  return (
    <>
      {showNamedCreation && (
        <div className="message-group-creation-header">
          <p
            className="message-group-creation-header-text"
            dangerouslySetInnerHTML={{__html: htmlGroupCreationHeader}}
          />
          <h2 className="message-group-creation-header-name" data-uie-name="conversation-name">
            {conversationName}
          </h2>
        </div>
      )}

      {hasUsers && (
        <div className="message-header">
          <div className="message-header-icon message-header-icon--svg text-foreground">
            {isGroupCreation && <Icon.MessageIcon />}
            {isMemberRemoval && <span className="icon-minus" />}
            {isMemberJoin && <span className="icon-plus" />}
          </div>
          <div className="message-header-label">
            <MessageContent onClickParticipants={onClickParticipants} message={message} />
          </div>
          {isMemberChange && (
            <div className="message-body-actions">
              <MessageTime
                timestamp={timestamp}
                data-uie-uid={message.id}
                data-uie-name="item-message-member-timestamp"
              />
            </div>
          )}
        </div>
      )}

      {hasUsers && message.showServicesWarning && (
        <p className="message-services-warning" data-uie-name="label-services-warning">
          {t('conversationServicesWarning')}
        </p>
      )}

      {isGroupCreation && shouldShowInvitePeople && (
        <div className="message-member-footer">
          <p>{t('guestRoomConversationHead')}</p>

          <Button
            variant={ButtonVariant.TERTIARY}
            type="button"
            onClick={onClickInvitePeople}
            data-uie-name="do-invite-people"
            style={{marginTop: '1em'}}
          >
            {t('guestRoomConversationButton')}
          </Button>
        </div>
      )}

      {isGroupCreation && isSelfTemporaryGuest && (
        <div className="message-member-footer">
          <p className="message-member-footer-message">{t('temporaryGuestJoinMessage')}</p>
          <p className="message-member-footer-description">{t('temporaryGuestJoinDescription')}</p>
        </div>
      )}

      {isGroupCreation && isCellsConversation && (
        <div className="message-header" data-uie-name="label-cells-conversation">
          <div className="message-header-icon message-header-icon--svg text-foreground">
            <CollectionIcon />
          </div>
          <p className="message-header-label">
            <span className="ellipsis">{t('conversationCellsConversationEnabled')}</span>
          </p>
        </div>
      )}

      {isGroupCreation && hasReadReceiptsTurnedOn && (
        <div className="message-header" data-uie-name="label-group-creation-receipts">
          <div className="message-header-icon message-header-icon--svg text-foreground">
            <Icon.ReadIcon />
          </div>
          <p className="message-header-label">
            <span className="ellipsis">{t('conversationCreateReceiptsEnabled')}</span>
          </p>
        </div>
      )}

      {isMemberLeave && user.isMe && isSelfTemporaryGuest && (
        <div className="message-member-footer">
          <p className="message-member-footer-description">{t('temporaryGuestLeaveDescription')}</p>
        </div>
      )}

      {isGroupCreation && <E2eEncryptionMessage isCellsConversation={isCellsConversation} />}
    </>
  );
};
