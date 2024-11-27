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

import {ReactElement, useEffect, useRef, useState} from 'react';

import {CodeHighlightNode, CodeNode} from '@lexical/code';
import {LinkNode} from '@lexical/link';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import {
  CODE,
  UNORDERED_LIST,
  ORDERED_LIST,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
} from '@lexical/markdown';
import {ClearEditorPlugin} from '@lexical/react/LexicalClearEditorPlugin';
import {InitialConfigType, LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {EditorRefPlugin} from '@lexical/react/LexicalEditorRefPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import {HorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {MarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import cx from 'classnames';
import {
  LexicalEditor,
  EditorState,
  $nodesOfType,
  FORMAT_TEXT_COMMAND,
  $getSelection,
  $isRangeSelection,
  TextNode,
  ElementNode,
} from 'lexical';

import {BoldIcon, BulletListIcon, CodeIcon, ItalicIcon, NumberedListIcon, UnderlineIcon} from '@wireapp/react-ui-kit';

import {DraftState} from 'Components/InputBar/util/DraftStateUtil';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {User} from 'src/script/entity/User';
import {getLogger} from 'Util/Logger';

import {EmojiNode} from './nodes/EmojiNode';
import {MentionNode} from './nodes/MentionNode';
import {AutoFocusPlugin} from './plugins/AutoFocusPlugin';
import {DraftStatePlugin} from './plugins/DraftStatePlugin';
import {EditedMessagePlugin} from './plugins/EditedMessagePlugin';
import {EmojiPickerPlugin} from './plugins/EmojiPickerPlugin';
import {GlobalEventsPlugin} from './plugins/GlobalEventsPlugin';
import {HistoryPlugin} from './plugins/HistoryPlugin';
import {findAndTransformEmoji, ReplaceEmojiPlugin} from './plugins/InlineEmojiReplacementPlugin';
import {MentionsPlugin} from './plugins/MentionsPlugin';
import {ReplaceCarriageReturnPlugin} from './plugins/ReplaceCarriageReturnPlugin/ReplaceCarriageReturnPlugin';
import {SendPlugin} from './plugins/SendPlugin';
import {TextChangePlugin} from './plugins/TextChangePlugin';

import {MentionEntity} from '../../message/MentionEntity';

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  mentions: {
    '@': `at-mentions`, // use the trigger name as the key
    '@Focused': 'focused-mentions', // add the "Focused" suffix to style the focused mention
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'font-mono bg-gray-100 px-1 rounded',
  },
  list: {
    ul: 'list-disc ml-4',
    ol: 'list-decimal ml-4',
  },
};

export type RichTextContent = {
  text: string;
  mentions?: MentionEntity[];
};

const logger = getLogger('LexicalInput');

interface RichTextEditorProps {
  placeholder: string;
  replaceEmojis?: boolean;
  editedMessage?: ContentMessage;
  children: ReactElement;
  hasLocalEphemeralTimer: boolean;
  getMentionCandidates: (search?: string | null) => User[];
  saveDraftState: (editor: string) => void;
  loadDraftState: () => Promise<DraftState>;
  onUpdate: (content: RichTextContent) => void;
  onArrowUp: () => void;
  onEscape: () => void;
  onShiftTab: () => void;
  onSend: () => void;
  onBlur: () => void;
  onSetup?: (editor: LexicalEditor) => void;
}

const createMentionEntity = (user: Pick<User, 'id' | 'name' | 'domain'>, mentionPosition: number): MentionEntity => {
  const userName = user.name();
  const mentionLength = userName.length + 1;

  return new MentionEntity(mentionPosition, mentionLength, user.id, user.domain);
};

const parseMentions = (editor: LexicalEditor, textValue: string, mentions: User[]) => {
  const editorMentions = editor.getEditorState().read(() =>
    $nodesOfType(MentionNode)
      // The nodes given by lexical are not sorted by their position in the text. Instead they are sorted according to the moment they were inserted into the global text.
      // We need to manually sort the nodes by their position before parsing the mentions in the entire text
      .sort((m1, m2) => (m1.isBefore(m2) ? -1 : 1))
      .map(node => node.getValue()),
  );
  let position = -1;

  return editorMentions.flatMap(mention => {
    const mentionPosition = textValue.indexOf(`@${mention}`, position + 1);
    const mentionOption = mentions.find(user => user.name() === mention);

    position = mentionPosition;
    return mentionOption ? [createMentionEntity(mentionOption, mentionPosition)] : [];
  });
};

export const RichTextEditor = ({
  placeholder,
  children,
  hasLocalEphemeralTimer,
  replaceEmojis,
  editedMessage,
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
  // Emojis
  const emojiPickerOpen = useRef<boolean>(true);
  const mentionsOpen = useRef<boolean>(true);
  const editorRef = useRef<LexicalEditor | null>(null);

  const editorConfig: InitialConfigType = {
    namespace: 'WireLexicalEditor',
    theme,
    onError(error: unknown) {
      logger.error(error);
    },
    nodes: [
      MentionNode,
      EmojiNode,
      ListItemNode,
      ListNode,
      HeadingNode,
      HorizontalRuleNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
    ],
  };

  const saveDraft = (editorState: EditorState) => {
    saveDraftState(JSON.stringify(editorState.toJSON()));
  };

  const parseUpdatedText = (editor: LexicalEditor, textValue: string) => {
    onUpdate({
      text: replaceEmojis ? findAndTransformEmoji(textValue) : textValue,
      mentions: parseMentions(editor, textValue, getMentionCandidates()),
    });
  };

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="controls-center">
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
          <EditedMessagePlugin message={editedMessage} />

          <EmojiPickerPlugin openStateRef={emojiPickerOpen} />
          <HistoryPlugin />
          <ListPlugin />
          {replaceEmojis && <ReplaceEmojiPlugin />}

          <ReplaceCarriageReturnPlugin />
          <MarkdownShortcutPlugin
            transformers={[
              CODE,
              UNORDERED_LIST,
              ORDERED_LIST,
              BOLD_ITALIC_STAR,
              BOLD_ITALIC_UNDERSCORE,
              BOLD_STAR,
              BOLD_UNDERSCORE,
              INLINE_CODE,
              ITALIC_STAR,
              ITALIC_UNDERSCORE,
              STRIKETHROUGH,
            ]}
          />

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

          <OnChangePlugin onChange={saveDraft} ignoreSelectionChange />
          <TextChangePlugin onUpdate={parseUpdatedText} />
          <SendPlugin
            onSend={() => {
              if (!mentionsOpen.current && !emojiPickerOpen.current) {
                onSend();
              }
            }}
          />
        </div>
        <FormatToolbar editor={editorRef.current!} />
      </div>

      {children}
    </LexicalComposer>
  );
};

function Placeholder({text, hasLocalEphemeralTimer}: {text: string; hasLocalEphemeralTimer: boolean}) {
  return (
    <div
      className={cx('editor-placeholder', {'conversation-input-bar-text--accent': hasLocalEphemeralTimer})}
      data-uie-name="input-placeholder"
    >
      {text}
    </div>
  );
}

const FormatToolbar = ({editor}: {editor: LexicalEditor}) => {
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  const isNodeInBulletList = (node: TextNode | ElementNode | null) => {
    if (!node) {
      return false;
    }
    if (node.getType() === 'list' && node.getTag() === 'ul') {
      return true;
    }
    return isNodeInBulletList(node.getParent());
  };

  const isNodeInNumberedList = (node: TextNode | ElementNode | null) => {
    if (!node) {
      return false;
    }
    if (node.getType() === 'list' && node.getTag() === 'ol') {
      return true;
    }
    return isNodeInNumberedList(node.getParent());
  };

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateToolbar = () => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const formats = [];
          // "italic" | "underline" | "code" | "bold" | "strikethrough" | "highlight" | "subscript" | "superscript"
          if (selection.hasFormat('bold')) {
            formats.push('bold');
          }
          if (selection.hasFormat('italic')) {
            formats.push('italic');
          }

          if (selection.hasFormat('underline')) {
            formats.push('underline');
          }

          if (selection.hasFormat('strikethrough')) {
            formats.push('strikethrough');
          }

          if (selection.hasFormat('code')) {
            formats.push('code');
          }

          if (isNodeInBulletList(selection.anchor.getNode())) {
            formats.push('bulletList');
          }

          if (isNodeInNumberedList(selection.anchor.getNode())) {
            formats.push('numberedList');
          }

          setActiveFormats(formats);
        }
      });
    };

    const unregister = editor.registerUpdateListener(updateToolbar);
    return () => unregister();
  }, [editor]);

  console.log({activeFormats});

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const toggleList = (type: 'bullet' | 'number') => {
    // if (type === 'bullet') {
    //   editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    // } else {
    //   editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    // }
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const isBulletList = isNodeInBulletList(selection.anchor.getNode());

        if (type === 'bullet') {
          if (isBulletList) {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
          } else {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          }
        }

        const isNumberedList = isNodeInNumberedList(selection.anchor.getNode());

        if (type === 'number') {
          if (isNumberedList) {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
          } else {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          }
        }
      }
    });
  };

  return (
    <div className="buttons-group">
      <button
        className={`controls-right-button buttons-group-button-left button-icon-large ${activeFormats.includes('bold') ? 'active' : ''}`}
        onClick={() => formatText('bold')}
      >
        <BoldIcon />
      </button>
      <button
        className={`conversation-button controls-right-button no-radius button-icon-large ${activeFormats.includes('italic') ? 'active' : ''}`}
        onClick={() => formatText('italic')}
      >
        <ItalicIcon />
      </button>
      <button
        className={`conversation-button controls-right-button no-radius button-icon-large ${activeFormats.includes('underline') ? 'active' : ''}`}
        onClick={() => formatText('underline')}
      >
        <UnderlineIcon />
      </button>
      {/* <button className="px-2 py-1 border rounded hover:bg-gray-100" onClick={() => formatText('strikethrough')}>
        Strike
      </button> */}
      <button
        className={`conversation-button controls-right-button no-radius button-icon-large ${activeFormats.includes('code') ? 'active' : ''}`}
        onClick={() => formatText('code')}
      >
        <CodeIcon />
      </button>
      <button
        className={`conversation-button controls-right-button no-radius button-icon-large ${activeFormats.includes('bulletList') ? 'active' : ''}`}
        onClick={() => toggleList('bullet')}
      >
        <BulletListIcon />
      </button>
      <button
        className={`conversation-button controls-right-button no-radius button-icon-large ${activeFormats.includes('numberedList') ? 'active' : ''}`}
        onClick={() => toggleList('number')}
      >
        <NumberedListIcon />
      </button>
      {/* <button
        className="px-2 py-1 border rounded hover:bg-gray-100"
        onClick={() =>
          editor.getEditorState().read(() => {
            const emojiPickerRef = emojiPickerOpen.current;
            if (emojiPickerRef !== undefined) {
              emojiPickerRef = true;
            }
          })
        }
      >
        Emoji
      </button> */}
    </div>
  );
};
