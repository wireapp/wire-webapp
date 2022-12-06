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

import React from 'react';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {Icon} from 'Components/Icon';
import {User} from 'src/script/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {useDisposableRef} from 'Util/useDisposableRef';

import {ConnectedMessage} from './memberMessage/ConnectedMessage';
import {MessageTime} from './MessageTime';

import {MemberMessage as MemberMessageEntity} from '../../../entity/message/MemberMessage';

export interface MemberMessageProps {
  classifiedDomains?: string[];
  hasReadReceiptsTurnedOn: boolean;
  isSelfTemporaryGuest: boolean;
  message: MemberMessageEntity;
  onClickCancelRequest: (message: MemberMessageEntity) => void;
  onClickInvitePeople: () => void;
  onClickParticipants: (participants: User[]) => void;
  shouldShowInvitePeople: boolean;
}

const MemberMessage: React.FC<MemberMessageProps> = ({
  message,
  shouldShowInvitePeople,
  isSelfTemporaryGuest,
  hasReadReceiptsTurnedOn,
  onClickInvitePeople,
  onClickParticipants,
  onClickCancelRequest,
  classifiedDomains,
}) => {
  const {
    otherUser,
    timestamp,
    user,
    name,
    htmlGroupCreationHeader,
    htmlCaption,
    highlightedUsers,
    showNamedCreation,
    hasUsers,
  } = useKoSubscribableChildren(message, [
    'otherUser',
    'timestamp',
    'user',
    'name',
    'htmlGroupCreationHeader',
    'htmlCaption',
    'highlightedUsers',
    'showNamedCreation',
    'hasUsers',
  ]);

  const showConnectedMessage = message.showLargeAvatar();
  const isGroupCreation = message.isGroupCreation();
  const isMemberRemoval = message.isMemberRemoval();
  const isMemberJoin = message.isMemberJoin();
  const isMemberLeave = message.isMemberLeave();
  const isMemberChange = message.isMemberChange();

  const initShowMore = useDisposableRef(element => {
    const link = element.querySelector('.message-header-show-more');
    if (link) {
      const listener = () => onClickParticipants(highlightedUsers);
      link.addEventListener('click', listener);
      return () => {
        link.removeEventListener('click', listener);
      };
    }
    return () => {};
  });

  return (
    <>
      {showConnectedMessage ? (
        <ConnectedMessage
          user={otherUser}
          showServicesWarning={message.showServicesWarning}
          onClickCancelRequest={() => onClickCancelRequest(message)}
          classifiedDomains={classifiedDomains}
        />
      ) : (
        <>
          {showNamedCreation && (
            <div className="message-group-creation-header">
              <p
                className="message-group-creation-header-text"
                dangerouslySetInnerHTML={{__html: htmlGroupCreationHeader}}
              />
              <h2 className="message-group-creation-header-name">{name}</h2>
            </div>
          )}
          {hasUsers && (
            <div className="message-header">
              <div className="message-header-icon message-header-icon--svg text-foreground">
                {isGroupCreation && <Icon.Message />}
                {isMemberRemoval && <span className="icon-minus" />}
                {isMemberJoin && <span className="icon-plus" />}
              </div>
              <div ref={initShowMore} className="message-header-label">
                <p className="message-header-caption" dangerouslySetInnerHTML={{__html: htmlCaption}} />
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
          {isGroupCreation && hasReadReceiptsTurnedOn && (
            <div className="message-header" data-uie-name="label-group-creation-receipts">
              <div className="message-header-icon message-header-icon--svg text-foreground">
                <Icon.Read />
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
        </>
      )}
    </>
  );
};

export {MemberMessage};
