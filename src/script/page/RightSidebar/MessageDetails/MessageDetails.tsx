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

import {FC, Fragment, useCallback, useEffect, useMemo, useState} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {amplify} from 'amplify';
import cx from 'classnames';

import {WebAppEvents} from '@wireapp/webapp-events';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Icon} from 'Components/Icon';
import {EmojiImg} from 'Components/MessagesList/Message/ContentMessage/MessageActions/MessageReactions/EmojiImg';
import {
  messageReactionDetailsMargin,
  reactionsCountAlignment,
} from 'Components/MessagesList/Message/ContentMessage/MessageActions/MessageReactions/MessageReactions.styles';
import {UserSearchableList} from 'Components/UserSearchableList';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getEmojiTitleFromEmojiUnicode, getEmojiUnicode} from 'Util/EmojiUtil';
import {t} from 'Util/LocalizerUtil';
import {getEmojiUrl, groupByReactionUsers} from 'Util/ReactionUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';
import {formatLocale} from 'Util/TimeUtil';

import {panelContentTitleStyles} from './MessageDetails.styles';

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
import {PanelEntity, PanelState} from '../RightSidebar';

const MESSAGE_STATES = {
  REACTIONS: 'reactions',
  NO_REACTIONS: 'no-reactions',
  NO_RECEIPTS: 'no-receipts',
  RECEIPTS: 'receipts',
  RECEIPTS_OFF: 'receipts-off',
};

const formatUserCount = (users: User[]): string => (users.length ? ` (${users.length})` : '');

const getTotalReactionUsersCount = (reactions: Map<string, User[]>): number => {
  let total = 0;
  reactions.forEach(reaction => {
    total += reaction.length;
  });
  return total;
};

const formatReactionCount = (reactions: Map<string, User[]>): string => {
  const total = getTotalReactionUsersCount(reactions);
  return total ? ` (${total})` : '';
};

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
  showReactions?: boolean;
  updateEntity: (message: Message) => void;
  togglePanel: (state: PanelState, entity: PanelEntity, addMode?: boolean) => void;
}

const MessageDetails: FC<MessageDetailsProps> = ({
  activeConversation,
  conversationRepository,
  messageEntity,
  teamRepository,
  searchRepository,
  showReactions = false,
  userRepository,
  onClose,
  updateEntity,
  togglePanel,
}) => {
  const [receiptUsers, setReceiptUsers] = useState<User[]>([]);
  const [reactionUsers, setReactionUsers] = useState<Map<string, User[]>>(new Map());
  const [messageId, setMessageId] = useState<string>(messageEntity.id);

  const [isReceiptsOpen, setIsReceiptsOpen] = useState<boolean>(!showReactions);

  const {
    timestamp,
    user: messageSender,
    reactions,
    readReceipts,
    edited_timestamp: editedTimestamp,
  } = useKoSubscribableChildren(messageEntity, ['timestamp', 'user', 'reactions', 'readReceipts', 'edited_timestamp']);

  const teamId = activeConversation.team_id;
  const supportsReceipts = messageSender.isMe && teamId;

  const supportsReactions = useMemo(() => {
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

    return getTotalReactionUsersCount(reactionUsers) ? MESSAGE_STATES.REACTIONS : MESSAGE_STATES.NO_REACTIONS;
  }, [supportsReceipts, isReceiptsOpen, messageEntity, receiptUsers, reactionUsers]);

  const getReactions = useCallback(async (reactions: UserReactionMap) => {
    const usersMap = new Map<string, User>();
    const currentReactions = Object.keys(reactions);
    const usersReactions = await userRepository.getUsersById(
      currentReactions.map(userId => ({domain: '', id: userId})),
    );
    usersReactions.forEach(user => {
      usersMap.set(user.id, user);
    });
    const reactionsGroupByUser = groupByReactionUsers(reactions);
    const reactionsGroupByUserMap = new Map<string, User[]>();
    reactionsGroupByUser.forEach((userIds, reaction) => {
      reactionsGroupByUserMap.set(
        reaction,
        userIds.map(userId => usersMap.get(userId)!),
      );
    });

    setReactionUsers(reactionsGroupByUserMap);
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
  const reactionsTitle = t('messageDetailsTitleReactions', formatReactionCount(reactionUsers));

  const panelTitle = useMemo(() => {
    if (!supportsReceipts) {
      return reactionsTitle;
    }

    if (!supportsReactions) {
      return receiptsTitle;
    }

    return t('messageDetailsTitle');
  }, [supportsReceipts, supportsReactions, reactionsTitle, receiptsTitle]);

  const showTabs = supportsReceipts && supportsReactions;

  const editedFooter = editedTimestamp ? formatTime(editedTimestamp) : '';

  const onReceipts = () => setIsReceiptsOpen(true);

  const onReactions = () => setIsReceiptsOpen(false);

  useEffect(() => {
    if (supportsReactions && reactions) {
      getReactions(reactions);
    }
  }, [getReactions, supportsReactions, reactions]);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, (oldId: string, updatedMessageEntity: Message) => {
      // listen for any changes to local message entities.
      // if the id of the message being viewed has changed, we store the new ID.
      if (oldId === messageId) {
        updateEntity(updatedMessageEntity);
        setMessageId(updatedMessageEntity.id);

        if (supportsReactions && isContentMessage(updatedMessageEntity)) {
          const messageReactions = updatedMessageEntity.reactions();
          getReactions(messageReactions);
        }
      }
    });
  }, [messageId, supportsReactions]);

  const onParticipantClick = (userEntity: User) => togglePanel(PanelState.GROUP_PARTICIPANT_USER, userEntity);

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
            className={cx('panel__tab button-reset-default', {'panel__tab--active': !isReceiptsOpen})}
            onClick={onReactions}
            data-uie-name="message-details-reaction-tab"
          >
            {reactionsTitle}
          </button>
          <button
            className={cx('panel__tab button-reset-default', {'panel__tab--active': isReceiptsOpen})}
            onClick={onReceipts}
            data-uie-name="message-details-read-tab"
          >
            {receiptsTitle}
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
            onClick={onParticipantClick}
          />
        )}

        {messageState === MESSAGE_STATES.REACTIONS &&
          Array.from(reactionUsers).map(reactions => {
            const [reactionKey, users] = reactions;
            const emojiUnicode = getEmojiUnicode(reactionKey);
            const emojiUrl = getEmojiUrl(emojiUnicode);
            const emojiName = getEmojiTitleFromEmojiUnicode(emojiUnicode);
            const capitalizedEmojiName = capitalizeFirstChar(emojiName);
            const emojiCount = users.length;
            return (
              <Fragment key={reactionKey}>
                <div css={panelContentTitleStyles} className="font-weight-bold">
                  <EmojiImg emojiUrl={emojiUrl} emojiName={emojiName} styles={messageReactionDetailsMargin} />
                  <span css={messageReactionDetailsMargin}>{capitalizedEmojiName}</span>
                  <span css={reactionsCountAlignment}>({emojiCount})</span>
                </div>
                <UserSearchableList
                  key={reactionKey}
                  dataUieName="reaction-list"
                  users={users}
                  noUnderline
                  conversationRepository={conversationRepository}
                  searchRepository={searchRepository}
                  teamRepository={teamRepository}
                  onClick={onParticipantClick}
                />
              </Fragment>
            );
          })}

        {messageState === MESSAGE_STATES.NO_RECEIPTS && (
          <div className="message-details__empty" data-uie-name="message-details-no-receipts-placeholder">
            <Icon.Read className="message-details__empty__icon" />
            <p className="message-details__empty__text">{t('messageDetailsNoReceipts')}</p>
          </div>
        )}

        {messageState === MESSAGE_STATES.NO_REACTIONS && (
          <div className="message-details__empty" data-uie-name="message-details-no-reactions-placeholder">
            <Icon.Like className="message-details__empty__icon" />
            <p className="message-details__empty__text">{t('messageDetailsNoReactions')}</p>
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
