/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import cx from 'classnames';

import * as Icon from 'Components/Icon';
import {DraftState, generateConversationInputStorageKey} from 'Components/InputBar/common/draftState/draftState';
import {useLocalStorage} from 'Hooks/useLocalStorage';
import {generateCellState} from 'Repositories/conversation/ConversationCellState';
import {Conversation, UnreadState} from 'Repositories/entity/Conversation';

import {iconStyle} from './CellDescription.style';

interface Props {
  conversation: Conversation;
  mutedState: number;
  isActive: boolean;
  isRequest: boolean;
  unreadState: UnreadState;
}

export const CellDescription = ({conversation, mutedState, isActive, isRequest, unreadState}: Props) => {
  const cellState = useMemo(() => generateCellState(conversation), [unreadState, mutedState, isRequest]);

  const storageKey = generateConversationInputStorageKey(conversation);
  // Hardcoded __amplify__ because of StorageUtil saving as __amplify__<storage_key>
  const [store] = useLocalStorage<{data?: DraftState}>(`__amplify__${storageKey}`);

  const draftMessage = store?.data?.plainMessage;
  const currentConversationDraftMessage = isActive ? '' : draftMessage;

  if (!cellState.description && !currentConversationDraftMessage) {
    return null;
  }

  return (
    <span
      className={cx('conversation-list-cell-description', {
        'conversation-list-cell-description--active': isActive,
      })}
      data-uie-name="secondary-line"
    >
      {!cellState.description && currentConversationDraftMessage && <Icon.DraftMessageIcon css={iconStyle} />}
      {cellState.description || currentConversationDraftMessage}
    </span>
  );
};
