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

import {ClearEditorPlugin} from '@lexical/react/LexicalClearEditorPlugin';
import {InitialConfigType, LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {EditorRefPlugin} from '@lexical/react/LexicalEditorRefPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import cx from 'classnames';
import {LexicalEditor, EditorState, $nodesOfType} from 'lexical';

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

  const editorConfig: InitialConfigType = {
    namespace: 'WireLexicalEditor',
    theme,
    onError(error: unknown) {
      logger.error(error);
    },
    nodes: [MentionNode, EmojiNode],
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
          <EditorRefPlugin editorRef={onSetup} />
          <DraftStatePlugin loadDraftState={loadDraftState} />
          <EditedMessagePlugin message={editedMessage} />

          <EmojiPickerPlugin openStateRef={emojiPickerOpen} />
          <HistoryPlugin />

          {replaceEmojis && <ReplaceEmojiPlugin />}

          <ReplaceCarriageReturnPlugin />

          <PlainTextPlugin
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
