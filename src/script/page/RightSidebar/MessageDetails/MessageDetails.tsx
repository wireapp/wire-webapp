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

import {FC, useMemo, useState} from 'react';

import cx from 'classnames';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import * as Icon from 'Components/Icon';
import {UserList} from 'Components/UserList';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {User} from 'Repositories/entity/User';
import {UserRepository} from 'Repositories/user/UserRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatLocale} from 'Util/TimeUtil';

import {UsersReactions} from './UserReactions';

import {SuperType} from '../../../message/SuperType';
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

const sortUsers = (userA: User, userB: User): number =>
  userA.name().localeCompare(userB.name(), undefined, {sensitivity: 'base'});

const formatTime = (time: string | number | Date) => formatLocale(time, 'P, p');

interface MessageDetailsProps {
  activeConversation: Conversation;
  onClose: () => void;
  conversationRepository: ConversationRepository;
  messageEntity: ContentMessage;
  userRepository: UserRepository;
  showReactions?: boolean;
  selfUser: User;
  togglePanel: (state: PanelState, entity: PanelEntity, addMode?: boolean) => void;
}

const MessageDetails: FC<MessageDetailsProps> = ({
  activeConversation,
  conversationRepository,
  messageEntity,
  showReactions = false,
  userRepository,
  selfUser,
  onClose,
  togglePanel,
}) => {
  const [isReceiptsOpen, setIsReceiptsOpen] = useState<boolean>(!showReactions);

  const {
    timestamp,
    user: messageSender,
    reactions,
    readReceipts,
    edited_timestamp: editedTimestamp,
  } = useKoSubscribableChildren(messageEntity, ['timestamp', 'user', 'reactions', 'readReceipts', 'edited_timestamp']);
  const totalNbReactions = reactions.reduce((acc, [, users]) => acc + users.length, 0);

  const teamId = activeConversation.teamId;
  const supportsReceipts = messageSender.isMe && teamId;

  const receiptUsers = userRepository
    .findUsersByIds(readReceipts.map(({userId, domain}) => ({domain: domain || '', id: userId})))
    .sort(sortUsers);

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

    return reactions.length > 0 ? MESSAGE_STATES.REACTIONS : MESSAGE_STATES.NO_REACTIONS;
  }, [supportsReceipts, isReceiptsOpen, reactions.length, messageEntity.expectsReadConfirmation, receiptUsers.length]);

  const receiptTimes = useMemo(() => {
    return readReceipts.reduce<Record<string, string>>((times, {userId, time}) => {
      times[userId] = formatTime(time);
      return times;
    }, {});
  }, [readReceipts]);

  const sentFooter = timestamp ? formatTime(timestamp) : '';

  const receiptsTitle = t('messageDetailsTitleReceipts', {
    count: messageEntity?.expectsReadConfirmation ? formatUserCount(receiptUsers) : '',
  });
  const reactionsTitle = t('messageDetailsTitleReactions', {
    count: totalNbReactions > 0 ? ` (${totalNbReactions})` : '',
  });

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

  const onParticipantClick = (userEntity: User) => togglePanel(PanelState.GROUP_PARTICIPANT_USER, userEntity);

  return (
    <div id="message-details" className="panel__page panel__message-details">
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
          <div data-uie-name="read-list">
            <UserList
              selfUser={selfUser}
              users={receiptUsers}
              infos={receiptTimes}
              noUnderline
              conversationRepository={conversationRepository}
              onClick={onParticipantClick}
              filterDeletedUsers={false}
            />
          </div>
        )}

        {messageState === MESSAGE_STATES.REACTIONS && (
          <UsersReactions
            reactions={reactions}
            selfUser={selfUser}
            findUsers={ids => userRepository.findUsersByIds(ids)}
            onParticipantClick={onParticipantClick}
          />
        )}

        {messageState === MESSAGE_STATES.NO_RECEIPTS && (
          <div className="panel__message-details__empty" data-uie-name="message-details-no-receipts-placeholder">
            <Icon.ReadIcon className="panel__message-details__empty__icon" />
            <p className="panel__message-details__empty__text">{t('messageDetailsNoReceipts')}</p>
          </div>
        )}

        {messageState === MESSAGE_STATES.NO_REACTIONS && (
          <div className="panel__message-details__empty" data-uie-name="message-details-no-reactions-placeholder">
            <Icon.LikeIcon className="panel__message-details__empty__icon" />
            <p className="panel__message-details__empty__text">{t('messageDetailsNoReactions')}</p>
          </div>
        )}

        {messageState === MESSAGE_STATES.RECEIPTS_OFF && (
          <div className="message-details__empty" data-uie-name="message-details-receipts-off-placeholder">
            <Icon.ReadIcon className="panel__message-details__empty__icon" />
            <p className="panel__message-details__empty__text">{t('messageDetailsReceiptsOff')}</p>
          </div>
        )}
      </FadingScrollbar>

      <div className="panel__footer">
        <p className="panel__footer__info" data-uie-name="status-message-details-sent">
          {t('messageDetailsSent', {sent: sentFooter})}
        </p>

        {editedFooter && (
          <p className="panel__footer__info" data-uie-name="status-message-details-edited">
            {t('messageDetailsEdited', {edited: editedFooter})}
          </p>
        )}
      </div>
    </div>
  );
};

export {MessageDetails};
