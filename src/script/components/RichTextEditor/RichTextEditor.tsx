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
  onUpdate: (content: RichTextContent) => void;
  onArrowUp: () => void;
  onEscape: () => void;
  editedMessage?: ContentMessage;
  children: ReactElement;
  hasLocalEphemeralTimer: boolean;
  saveDraftState: (editor: string) => void;
  loadDraftState: () => Promise<DraftState>;
  getMentionCandidates: (search?: string | null) => User[];
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
  const editorMentions = editor.getEditorState().read(() => $nodesOfType(MentionNode).map(node => node.__value));
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
  onUpdate,
  children,
  hasLocalEphemeralTimer,
  replaceEmojis,
  saveDraftState,
  loadDraftState,
  onEscape,
  onArrowUp,
  editedMessage,
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

          <PlainTextPlugin
            contentEditable={<ContentEditable className="conversation-input-bar-text" data-uie-name="input-message" />}
            placeholder={<Placeholder text={placeholder} hasLocalEphemeralTimer={hasLocalEphemeralTimer} />}
            ErrorBoundary={LexicalErrorBoundary}
          />

          <MentionsPlugin
            onSearch={search => (typeof search === 'string' ? getMentionCandidates(search) : [])}
            openStateRef={mentionsOpen}
          />

          <OnChangePlugin onChange={saveDraft} />
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
    <div className={cx('editor-placeholder', {'conversation-input-bar-text--accent': hasLocalEphemeralTimer})}>
      {text}
    </div>
  );
}
