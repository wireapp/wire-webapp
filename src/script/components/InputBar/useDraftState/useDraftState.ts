/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useCallback} from 'react';

import {LexicalEditor, CLEAR_EDITOR_COMMAND} from 'lexical';

import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {StorageRepository} from 'src/script/storage';
import {sanitizeMarkdown} from 'Util/MarkdownUtil';

import {loadDraftState, saveDraftState} from '../common/draftState/draftState';

interface UseDraftStateProps {
  conversation: Conversation;
  storageRepository: StorageRepository;
  messageRepository: MessageRepository;
  editorRef: React.RefObject<LexicalEditor>;
}

export const useDraftState = ({conversation, storageRepository, messageRepository, editorRef}: UseDraftStateProps) => {
  const reset = useCallback(() => {
    editorRef.current?.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
  }, [editorRef]);

  const load = useCallback(async () => {
    return loadDraftState(conversation, storageRepository, messageRepository);
  }, [conversation, messageRepository, storageRepository]);

  const save = async (editorState: string, text: string, replyId = '') => {
    void saveDraftState({
      storageRepository,
      conversation,
      editorState,
      plainMessage: sanitizeMarkdown(text),
      replyId,
    });
  };

  return {
    reset,
    load,
    save,
  };
};
