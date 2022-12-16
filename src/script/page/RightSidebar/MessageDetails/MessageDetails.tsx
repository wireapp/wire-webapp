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

import {FC, useCallback, useEffect, useMemo, useState} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {amplify} from 'amplify';
import cx from 'classnames';

import {WebAppEvents} from '@wireapp/webapp-events';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Icon} from 'Components/Icon';
import {UserSearchableList} from 'Components/UserSearchableList';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatLocale} from 'Util/TimeUtil';

import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {Conversation} from '../../../entity/Conversation';
import {ContentMessage} from '../../../entity/message/ContentMessage';
import {Message} from '../../../entity/message/Message';
import {User} from '../../../entity/User';
import {isContentMessage} from '../../../guards/Message';
import {SuperType} from '../../../message/SuperType';
import {SearchRepository} from '../../../search/SearchRepository';
import {UserReactionMap} from '../../../storage';
import {TeamRepository} from '../../../team/TeamRepository';
import {UserRepository} from '../../../user/UserRepository';
import {PanelHeader} from '../PanelHeader';

const MESSAGE_STATES = {
  LIKES: 'likes',
  NO_LIKES: 'no-likes',
  NO_RECEIPTS: 'no-receipts',
  RECEIPTS: 'receipts',
  RECEIPTS_OFF: 'receipts-off',
};

const formatUserCount = (users: User[]): string => (users.length ? ` (${users.length})` : '');

const sortUsers = (userA: User, userB: User): number =>
  userA.name().localeCompare(userB.name(), undefined, {sensitivity: 'base'});

const formatTime = (time: string | number | Date) => formatLocale(time, 'P, p');

interface MessageDetailsProps {
  activeConversation: Conversation;
  onClose: () => void;
  conversationRepository: ConversationRepository;
  messageEntity: ContentMessage;
  teamRepository: TeamRepository;
  searchRepository: SearchRepository;
  userRepository: UserRepository;
  showLikes?: boolean;
  updateEntity: (message: Message) => void;
}

const MessageDetails: FC<MessageDetailsProps> = ({
  activeConversation,
  conversationRepository,
  messageEntity,
  teamRepository,
  searchRepository,
  showLikes = false,
  userRepository,
  onClose,
  updateEntity,
}) => {
  const [receiptUsers, setReceiptUsers] = useState<User[]>([]);
  const [likeUsers, setLikeUsers] = useState<User[]>([]);
  const [messageId, setMessageId] = useState<string>(messageEntity.id);

  const [isReceiptsOpen, setIsReceiptsOpen] = useState<boolean>(!showLikes);

  const {
    timestamp,
    user: messageSender,
    reactions,
    readReceipts,
    edited_timestamp: editedTimestamp,
  } = useKoSubscribableChildren(messageEntity, ['timestamp', 'user', 'reactions', 'readReceipts', 'edited_timestamp']);

  const teamId = activeConversation.team_id;
  const supportsReceipts = messageSender.isMe && teamId;

  const supportsLikes = useMemo(() => {
    const isPing = messageEntity.super_type === SuperType.PING;
    const isEphemeral = messageEntity?.isEphemeral();

    return !isPing && !isEphemeral;
  }, [messageEntity]);

  const messageState = useMemo(() => {
    if (supportsReceipts && isReceiptsOpen) {
      if (!messageEntity.expectsReadConfirmation) {
        return MESSAGE_STATES.RECEIPTS_OFF;
      }

      return receiptUsers.length ? MESSAGE_STATES.RECEIPTS : MESSAGE_STATES.NO_RECEIPTS;
    }

    return likeUsers.length ? MESSAGE_STATES.LIKES : MESSAGE_STATES.NO_LIKES;
  }, [supportsReceipts, isReceiptsOpen, messageEntity, receiptUsers, likeUsers]);

  const getLikes = useCallback(async (reactions: UserReactionMap) => {
    const currentLikes = Object.keys(reactions);
    const usersLikes = await userRepository.getUsersById(currentLikes.map(likeId => ({domain: '', id: likeId})));
    const sortedUsersLikes = usersLikes.sort(sortUsers);

    setLikeUsers(sortedUsersLikes);
  }, []);

  const receiptTimes = useMemo(() => {
    const userIds: QualifiedId[] = readReceipts.map(({userId, domain}) => ({domain: domain || '', id: userId}));
    userRepository.getUsersById(userIds).then((users: User[]) => {
      setReceiptUsers(users.sort(sortUsers));
    });

    return readReceipts.reduce<Record<string, string>>((times, {userId, time}) => {
      times[userId] = formatTime(time);
      return times;
    }, {});
  }, [readReceipts]);

  const sentFooter = timestamp ? formatTime(timestamp) : '';

  const receiptsTitle = t(
    'messageDetailsTitleReceipts',
    messageEntity?.expectsReadConfirmation ? formatUserCount(receiptUsers) : '',
  );
  const likesTitle = t('messageDetailsTitleLikes', formatUserCount(likeUsers));

  const panelTitle = useMemo(() => {
    if (!supportsReceipts) {
      return likesTitle;
    }

    if (!supportsLikes) {
      return receiptsTitle;
    }

    return t('messageDetailsTitle');
  }, [supportsReceipts, supportsLikes, likesTitle, receiptsTitle]);

  const showTabs = supportsReceipts && supportsLikes;

  const editedFooter = editedTimestamp ? formatTime(editedTimestamp) : '';

  const onReceipts = () => setIsReceiptsOpen(true);

  const onLikes = () => setIsReceiptsOpen(false);

  useEffect(() => {
    if (supportsLikes && reactions) {
      getLikes(reactions);
    }
  }, [getLikes, supportsLikes, reactions]);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, (oldId: string, updatedMessageEntity: Message) => {
      // listen for any changes to local message entities.
      // if the id of the message being viewed has changed, we store the new ID.
      if (oldId === messageId) {
        updateEntity(updatedMessageEntity);
        setMessageId(updatedMessageEntity.id);

        if (supportsLikes && isContentMessage(updatedMessageEntity)) {
          const messageReactions = updatedMessageEntity.reactions();
          getLikes(messageReactions);
        }
      }
    });
  }, [messageId, supportsLikes]);

  return (
    <div id="message-details" className="panel__page message-details">
      <PanelHeader
        onClose={onClose}
        title={panelTitle}
        showBackArrow={false}
        titleDataUieName="message-details-title"
      />

      {showTabs && (
        <div className="panel__tabs">
          <button
            className={cx('panel__tab button-reset-default', {'panel__tab--active': isReceiptsOpen})}
            onClick={onReceipts}
            data-uie-name="message-details-read-tab"
          >
            {receiptsTitle}
          </button>
          <button
            className={cx('panel__tab button-reset-default', {'panel__tab--active': !isReceiptsOpen})}
            onClick={onLikes}
            data-uie-name="message-details-like-tab"
          >
            {likesTitle}
          </button>
        </div>
      )}

      <FadingScrollbar className="panel__content" style={{flexGrow: 1}}>
        {messageState === MESSAGE_STATES.RECEIPTS && (
          <UserSearchableList
            dataUieName="read-list"
            users={receiptUsers}
            infos={receiptTimes}
            noUnderline
            conversationRepository={conversationRepository}
            searchRepository={searchRepository}
            teamRepository={teamRepository}
          />
        )}

        {messageState === MESSAGE_STATES.LIKES && (
          <UserSearchableList
            dataUieName="like-list"
            users={likeUsers}
            noUnderline
            conversationRepository={conversationRepository}
            searchRepository={searchRepository}
            teamRepository={teamRepository}
          />
        )}

        {messageState === MESSAGE_STATES.NO_RECEIPTS && (
          <div className="message-details__empty" data-uie-name="message-details-no-receipts-placeholder">
            <Icon.Read className="message-details__empty__icon" />
            <p className="message-details__empty__text">{t('messageDetailsNoReceipts')}</p>
          </div>
        )}

        {messageState === MESSAGE_STATES.NO_LIKES && (
          <div className="message-details__empty" data-uie-name="message-details-no-likes-placeholder">
            <Icon.Like className="message-details__empty__icon" />
            <p className="message-details__empty__text">{t('messageDetailsNoLikes')}</p>
          </div>
        )}

        {messageState === MESSAGE_STATES.RECEIPTS_OFF && (
          <div className="message-details__empty" data-uie-name="message-details-receipts-off-placeholder">
            <Icon.Read className="message-details__empty__icon" />
            <p className="message-details__empty__text">{t('messageDetailsReceiptsOff')}</p>
          </div>
        )}
      </FadingScrollbar>

      <div className="panel__footer">
        <p className="panel__footer__info" data-uie-name="status-message-details-sent">
          {t('messageDetailsSent', sentFooter)}
        </p>

        {editedFooter && (
          <p className="panel__footer__info" data-uie-name="status-message-details-edited">
            {t('messageDetailsEdited', editedFooter)}
          </p>
        )}
      </div>
    </div>
  );
};

export {MessageDetails};
