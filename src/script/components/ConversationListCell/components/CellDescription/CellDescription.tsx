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

import {useCallback, useEffect, useMemo} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';

import * as Icon from 'Components/Icon';
import {generateConversationInputStorageKey, getDraftTextMessageContent} from 'Components/InputBar/util/DraftStateUtil';
import {useMessageDraftState} from 'Hooks/useMessageDraftState';

import {iconStyle} from './CellDescription.style';

import {generateCellState} from '../../../../conversation/ConversationCellState';
import {Conversation, UnreadState} from '../../../../entity/Conversation';
import {StorageService} from '../../../../storage';

interface Props {
  conversation: Conversation;
  mutedState: number;
  isActive: boolean;
  isRequest: boolean;
  unreadState: UnreadState;
}

export const CellDescription = ({conversation, mutedState, isActive, isRequest, unreadState}: Props) => {
  const storageService = container.resolve(StorageService);
  const {draftMessage} = useMessageDraftState();
  const currentConversationDraftMessage = isActive ? '' : draftMessage[conversation.id];

  const cellState = useMemo(() => generateCellState(conversation), [unreadState, mutedState, isRequest]);

  const getDraftMessageContent = useCallback(async () => {
    const storageKey = generateConversationInputStorageKey(conversation);
    const storageValue = await storageService.loadFromSimpleStorage<any>(storageKey);

    if (typeof storageValue === 'undefined') {
      return;
    }

    getDraftTextMessageContent(conversation, storageValue.editorState);
  }, [conversation, storageService]);

  useEffect(() => {
    void getDraftMessageContent();
  }, [getDraftMessageContent]);

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
