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

import {ReactNode, useRef} from 'react';

import {$convertToMarkdownString} from '@lexical/markdown';
import {ClearEditorPlugin} from '@lexical/react/LexicalClearEditorPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {EditorRefPlugin} from '@lexical/react/LexicalEditorRefPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {MarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {LexicalEditor, EditorState} from 'lexical';

import {DraftState} from 'Components/inputBar/common/draftState/draftState';
import {MessageContent} from 'Components/inputBar/common/messageContent/messageContent';
import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import {User} from 'Repositories/entity/user';

import {editorConfig} from './editorConfig';
import {FormatToolbar} from './formatToolbar/formatToolbar';
import {Placeholder} from './placeholder/placeholder';
import {AutoFocusPlugin} from './plugins/autoFocusPlugin/autoFocusPlugin';
import {AutoLinkPlugin} from './plugins/autoLinkPlugin/autoLinkPlugin';
import {BlockquotePlugin} from './plugins/blockquotePlugin/blockquotePlugin';
import {CodeHighlightPlugin} from './plugins/codeHighlightPlugin/codeHighlightPlugin';
import {DraftStatePlugin} from './plugins/draftStatePlugin/draftStatePlugin';
import {EditedMessagePlugin} from './plugins/editedMessagePlugin/editedMessagePlugin';
import {EmojiPickerPlugin} from './plugins/emojiPickerPlugin';
import {GlobalEventsPlugin} from './plugins/globalEventsPlugin/globalEventsPlugin';
import {HistoryPlugin} from './plugins/historyPlugin/historyPlugin';
import {ReplaceEmojiPlugin} from './plugins/inlineEmojiReplacementPlugin';
import {LinkPlugin} from './plugins/linkPlugin/linkPlugin';
import {ListItemTabIndentationPlugin} from './plugins/listIndentationPlugin/listIndentationPlugin';
import {ListMaxIndentLevelPlugin} from './plugins/listMaxIndentLevelPlugin/listMaxIndentLevelPlugin';
import {MentionsPlugin} from './plugins/mentionsPlugin';
import {PastePlugin} from './plugins/pastePlugin/pastePlugin';
import {ReplaceCarriageReturnPlugin} from './plugins/replaceCarriageReturnPlugin/replaceCarriageReturnPlugin';
import {SendPlugin} from './plugins/sendPlugin/sendPlugin';
import {markdownTransformers} from './utils/markdownTransformers';
import {parseMentions} from './utils/parseMentions';
import {transformMessage} from './utils/transformMessage';
import {useEditorDraftState} from './utils/useEditorDraftState';

interface RichTextEditorProps {
  placeholder: string;
  replaceEmojis: boolean;
  editedMessage?: ContentMessage;
  children: ReactNode;
  hasLocalEphemeralTimer: boolean;
  showFormatToolbar: boolean;
  showMarkdownPreview: boolean;
  getMentionCandidates: (search?: string | null) => User[];
  saveDraftState: (editor: string, plainMessage: string, replyId?: string) => void;
  loadDraftState: () => Promise<DraftState>;
  onUpdate: (content: MessageContent) => void;
  onArrowUp: () => void;
  onEscape: () => void;
  onShiftTab: () => void;
  onSend: () => void;
  onBlur: () => void;
  onSetup?: (editor: LexicalEditor) => void;
}

export const RichTextEditor = ({
  placeholder,
  children,
  hasLocalEphemeralTimer,
  replaceEmojis,
  editedMessage,
  showFormatToolbar,
  showMarkdownPreview,
  onUpdate,
  saveDraftState,
  loadDraftState,
  onEscape,
  onArrowUp,
  getMentionCandidates,
  onShiftTab,
  onBlur,
  onSend,
  onSetup = () => {},
}: RichTextEditorProps) => {
  const editorRef = useRef<LexicalEditor | null>(null);
  const emojiPickerOpen = useRef<boolean>(true);
  const mentionsOpen = useRef<boolean>(true);

  const {saveDraft} = useEditorDraftState({
    editorRef,
    saveDraftState,
    replaceEmojis,
  });

  const handleChange = (editorState: EditorState) => {
    editorState.read(() => {
      if (!editorRef.current) {
        return;
      }

      const markdown = $convertToMarkdownString(markdownTransformers, undefined, true);

      const text = transformMessage({replaceEmojis, markdown});

      onUpdate({
        text,
        mentions: parseMentions(editorRef.current, markdown, getMentionCandidates()),
      });

      saveDraft();
    });
  };

  const isEditing = !!editedMessage;

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="controls-center input-bar-field">
        <div className="input-bar--wrapper">
          <AutoFocusPlugin />
          <GlobalEventsPlugin onShiftTab={onShiftTab} onEscape={onEscape} onArrowUp={onArrowUp} onBlur={onBlur} />
          <EditorRefPlugin
            editorRef={editor => {
              editorRef.current = editor;
              onSetup(editor!);
            }}
          />
          <DraftStatePlugin loadDraftState={loadDraftState} />
          <EditedMessagePlugin message={editedMessage} showMarkdownPreview={showMarkdownPreview} />
          <EmojiPickerPlugin openStateRef={emojiPickerOpen} />
          <HistoryPlugin />

          {replaceEmojis && <ReplaceEmojiPlugin />}
          <ReplaceCarriageReturnPlugin />

          {showMarkdownPreview && (
            <>
              <ListPlugin />
              <ListItemTabIndentationPlugin />
              <ListMaxIndentLevelPlugin maxDepth={3} />
              <MarkdownShortcutPlugin transformers={markdownTransformers} />
              <CodeHighlightPlugin />
              <BlockquotePlugin />
              <LinkPlugin />
              <AutoLinkPlugin />
            </>
          )}

          <RichTextPlugin
            contentEditable={<ContentEditable className="conversation-input-bar-text" data-uie-name="input-message" />}
            placeholder={<Placeholder text={placeholder} hasLocalEphemeralTimer={hasLocalEphemeralTimer} />}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <ClearEditorPlugin />
          <MentionsPlugin
            onSearch={search => (typeof search === 'string' ? getMentionCandidates(search) : [])}
            openStateRef={mentionsOpen}
          />
          <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
          <SendPlugin
            onSend={() => {
              if (!mentionsOpen.current && !emojiPickerOpen.current) {
                onSend();
              }
            }}
          />
          <PastePlugin getMentionCandidates={getMentionCandidates} isPreviewMode={showMarkdownPreview} />
        </div>
      </div>
      {showFormatToolbar && showMarkdownPreview && (
        <div className="input-bar-toolbar">
          <FormatToolbar isEditing={isEditing} />
        </div>
      )}
      {children}
    </LexicalComposer>
  );
};
