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

import {MutableRefObject} from 'react';

import {LexicalEditor} from 'lexical';

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {User} from 'Repositories/entity/User';

import {RichTextEditor} from './RichTextEditor';

import {DraftState} from '../common/draftState/draftState';
import {MessageContent} from '../common/messageContent/messageContent';

interface InputBarEditorProps {
  editorRef: MutableRefObject<LexicalEditor | null>;
  editedMessage: ContentMessage | undefined;
  inputPlaceholder: string;
  hasLocalEphemeralTimer: boolean;
  showMarkdownPreview: boolean;
  formatToolbar: {
    open: boolean;
    handleClick: () => void;
  };
  onSetup: (editor: LexicalEditor) => void;
  onEscape: () => void;
  onArrowUp: () => void;
  onShiftTab: () => void;
  onBlur: () => void;
  onUpdate: (content: MessageContent) => void;
  onSend: () => void;
  getMentionCandidates: (search?: string | null) => User[];
  saveDraftState: (editorState: string, plainMessage: string, replyId?: string) => void;
  loadDraftState: () => Promise<DraftState>;
  replaceEmojis: boolean;
  children: React.ReactNode;
}

export const InputBarEditor = ({
  editorRef,
  editedMessage,
  inputPlaceholder,
  hasLocalEphemeralTimer,
  showMarkdownPreview,
  formatToolbar,
  onSetup,
  onEscape,
  onArrowUp,
  onShiftTab,
  onBlur,
  onUpdate,
  onSend,
  getMentionCandidates,
  saveDraftState,
  loadDraftState,
  replaceEmojis,
  children,
}: InputBarEditorProps) => {
  return (
    <RichTextEditor
      onSetup={editor => {
        editorRef.current = editor;
        onSetup(editor);
      }}
      editedMessage={editedMessage}
      onEscape={onEscape}
      onArrowUp={onArrowUp}
      getMentionCandidates={getMentionCandidates}
      replaceEmojis={replaceEmojis}
      placeholder={inputPlaceholder}
      onUpdate={onUpdate}
      hasLocalEphemeralTimer={hasLocalEphemeralTimer}
      showFormatToolbar={formatToolbar.open}
      showMarkdownPreview={showMarkdownPreview}
      saveDraftState={saveDraftState}
      loadDraftState={loadDraftState}
      onShiftTab={onShiftTab}
      onSend={onSend}
      onBlur={onBlur}
    >
      {children}
    </RichTextEditor>
  );
};
