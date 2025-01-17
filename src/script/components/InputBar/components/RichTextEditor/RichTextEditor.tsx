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

import {ReactElement, useRef} from 'react';

import {$isLinkNode} from '@lexical/link';
import {$convertToMarkdownString} from '@lexical/markdown';
import {ClearEditorPlugin} from '@lexical/react/LexicalClearEditorPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {EditorRefPlugin} from '@lexical/react/LexicalEditorRefPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {LinkPlugin} from '@lexical/react/LexicalLinkPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {MarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {LexicalEditor, EditorState, $isRangeSelection, $getSelection} from 'lexical';

import {DraftState} from 'Components/InputBar/util/DraftStateUtil';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {User} from 'src/script/entity/User';

import {FormatToolbar} from './components/FormatToolbar/FormatToolbar';
import {Placeholder} from './components/Placeholder/Placeholder';
import {editorConfig, FORMAT_LINK_COMMAND} from './editorConfig';
import {AutoFocusPlugin} from './plugins/AutoFocusPlugin/AutoFocusPlugin';
import {BlockquotePlugin} from './plugins/BlockquotePlugin/BlockquotePlugin';
import {CodeHighlightPlugin} from './plugins/CodeHighlightPlugin/CodeHighlightPlugin';
import {DraftStatePlugin} from './plugins/DraftStatePlugin/DraftStatePlugin';
import {EditedMessagePlugin} from './plugins/EditedMessagePlugin/EditedMessagePlugin';
import {EmojiPickerPlugin} from './plugins/EmojiPickerPlugin';
import {GlobalEventsPlugin} from './plugins/GlobalEventsPlugin/GlobalEventsPlugin';
import {HistoryPlugin} from './plugins/HistoryPlugin/HistoryPlugin';
import {ReplaceEmojiPlugin} from './plugins/InlineEmojiReplacementPlugin';
import {LinkClickPlugin} from './plugins/LinkClickPlugin/LinkClickPlugin';
import {ListItemTabIndentationPlugin} from './plugins/ListIndentationPlugin/ListIndentationPlugin';
import {ListMaxIndentLevelPlugin} from './plugins/ListMaxIndentLevelPlugin/ListMaxIndentLevelPlugin';
import {MentionsPlugin} from './plugins/MentionsPlugin';
import {ReplaceCarriageReturnPlugin} from './plugins/ReplaceCarriageReturnPlugin/ReplaceCarriageReturnPlugin';
import {SendPlugin} from './plugins/SendPlugin/SendPlugin';
import {markdownTransformers} from './utils/markdownTransformers';
import {parseMentions} from './utils/parseMentions';
import {transformMessage} from './utils/transformMessage';
import {useEditorDraftState} from './utils/useEditorDraftState';

import {MentionEntity} from '../../../../message/MentionEntity';

const SUPPORTED_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'sms:']);

export type RichTextContent = {
  text: string;
  mentions?: MentionEntity[];
};

interface RichTextEditorProps {
  placeholder: string;
  replaceEmojis: boolean;
  editedMessage?: ContentMessage;
  children: ReactElement;
  hasLocalEphemeralTimer: boolean;
  showFormatToolbar: boolean;
  showMarkdownPreview: boolean;
  getMentionCandidates: (search?: string | null) => User[];
  saveDraftState: (editor: string, plainMessage: string) => void;
  loadDraftState: () => Promise<DraftState>;
  onUpdate: (content: RichTextContent) => void;
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

      const markdown = $convertToMarkdownString(markdownTransformers);

      const text = transformMessage({replaceEmojis, markdown});

      onUpdate({
        text,
        mentions: parseMentions(editorRef.current, markdown, getMentionCandidates()),
      });

      saveDraft();
    });
  };

  const handleLinkClick = (linkNode: any) => {
    editorRef.current?.update(() => {
      if ($isLinkNode(linkNode)) {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.setTextNodeRange(
            linkNode.getFirstChild(),
            0,
            linkNode.getFirstChild(),
            linkNode.getTextContent().length,
          );
        }
        editorRef.current?.dispatchCommand(FORMAT_LINK_COMMAND, undefined);
      }
    });
  };

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
          <LinkPlugin
            validateUrl={url => {
              try {
                const parsedUrl = new URL(url);
                return SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol);
              } catch {
                return !!url.startsWith('http');
              }
            }}
          />
          <LinkClickPlugin onLinkClick={handleLinkClick} />
        </div>
      </div>
      {showFormatToolbar && showMarkdownPreview && (
        <div className="input-bar-toolbar">
          <FormatToolbar />
        </div>
      )}
      {children}
    </LexicalComposer>
  );
};
