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

import {Fragment} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {EmojiImg} from 'Components/MessagesList/Message/ContentMessage/MessageActions/MessageReactions/EmojiImg';
import {
  messageReactionDetailsMargin,
  reactionsCountAlignment,
} from 'Components/MessagesList/Message/ContentMessage/MessageActions/MessageReactions/MessageReactions.styles';
import {UserList} from 'Components/UserList';
import {User} from 'src/script/entity/User';
import {ReactionMap} from 'src/script/storage';
import {getEmojiTitleFromEmojiUnicode, getEmojiUnicode} from 'Util/EmojiUtil';
import {getEmojiUrl} from 'Util/ReactionUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';

import {panelContentTitleStyles} from './MessageDetails.styles';

interface UsersReactionsProps {
  reactions: ReactionMap;
  findUsers: (userId: QualifiedId[]) => User[];
  selfUser: User;
  onParticipantClick: (user: User) => void;
}

export function UsersReactions({reactions, selfUser, findUsers, onParticipantClick}: UsersReactionsProps) {
  return reactions.map(reaction => {
    const [reactionKey, userIds] = reaction;
    const emojiUnicode = getEmojiUnicode(reactionKey);
    const emojiUrl = getEmojiUrl(emojiUnicode);
    const emojiName = getEmojiTitleFromEmojiUnicode(emojiUnicode);
    const capitalizedEmojiName = capitalizeFirstChar(emojiName);
    const users = findUsers(userIds);
    const emojiCount = users.length;

    return (
      <Fragment key={reactionKey}>
        <div css={panelContentTitleStyles} className="font-weight-bold">
          <EmojiImg emojiUrl={emojiUrl} emojiName={emojiName} styles={messageReactionDetailsMargin} />
          <span css={messageReactionDetailsMargin}>{capitalizedEmojiName}</span>
          <span css={reactionsCountAlignment}>({emojiCount})</span>
        </div>
        <div data-uie-name="reaction-list">
          <UserList selfUser={selfUser} key={reactionKey} users={users} noUnderline onClick={onParticipantClick} />
        </div>
      </Fragment>
    );
  });
}
