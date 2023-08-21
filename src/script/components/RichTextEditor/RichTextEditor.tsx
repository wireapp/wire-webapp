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

import {useEffect, useState, ReactElement, useRef} from 'react';

import {InitialConfigType, LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {EditorRefPlugin} from '@lexical/react/LexicalEditorRefPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {mergeRegister} from '@lexical/utils';
import type {WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';
import cx from 'classnames';
import {
  LexicalEditor,
  EditorState,
  $nodesOfType,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_LOW,
  $getRoot,
  $setSelection,
} from 'lexical';

import {WebAppEvents} from '@wireapp/webapp-events';

import {DraftState} from 'Components/InputBar/util/DraftStateUtil';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {User} from 'src/script/entity/User';
import {getLogger} from 'Util/Logger';

import {EmojiNode} from './nodes/EmojiNode';
import {MentionNode} from './nodes/MentionNode';
import {AutoFocusPlugin} from './plugins/AutoFocusPlugin';
import {DraftStatePlugin} from './plugins/DraftStatePlugin';
import {EditMessagePlugin} from './plugins/EditMessagePlugin';
import {EmojiPickerPlugin} from './plugins/EmojiPickerPlugin';
import {GlobalEventsPlugin} from './plugins/GlobalEventsPlugin';
import {HistoryPlugin} from './plugins/HistoryPlugin';
import {ReplaceEmojiPlugin} from './plugins/InlineEmojiReplacementPlugin';
import {MentionsPlugin} from './plugins/MentionsPlugin';
import {toEditorNodes} from './utils/messageToEditorNodes';

import {MentionEntity} from '../../message/MentionEntity';
import {PropertiesRepository} from '../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../properties/PropertiesType';
import {SearchRepository} from '../../search/SearchRepository';

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  mentions: {
    '@': `at-mentions`, // use the trigger name as the key
  },
};

const logger = getLogger('LexicalInput');

export type RichTextContent = {
  text: string;
  mentions?: MentionEntity[];
};

interface RichTextEditorProps {
  readonly propertiesRepository: PropertiesRepository;
  readonly searchRepository: SearchRepository;
  placeholder: string;
  onUpdate: (content: RichTextContent) => void;
  editMessage: (messageEntity: ContentMessage) => void;
  editedMessage?: ContentMessage;
  children: ReactElement;
  hasLocalEphemeralTimer: boolean;
  saveDraftState: (editor: string) => void;
  loadDraftState: () => Promise<DraftState>;
  mentionCandidates: User[];
  onShiftTab: () => void;
  onSend: () => void;
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
  propertiesRepository,
  searchRepository,
  onUpdate,
  children,
  hasLocalEphemeralTimer,
  saveDraftState,
  loadDraftState,
  editMessage,
  editedMessage,
  mentionCandidates,
  onShiftTab,
  onSend,
  onSetup,
}: RichTextEditorProps) => {
  // Emojis
  const editorRef = useRef<LexicalEditor>();
  const cleanupRef = useRef<() => void>();
  const emojiPickerOpen = useRef<boolean>(true);
  const mentionsOpen = useRef<boolean>(true);

  const setupEditor = (editor: LexicalEditor) => {
    editorRef.current = editor;
    cleanupRef.current = mergeRegister(
      editor.registerTextContentListener(textContent => {
        onUpdate({
          text: textContent,
          mentions: parseMentions(editor, textContent, mentionCandidates),
        });
      }),

      editor.registerCommand(
        KEY_ENTER_COMMAND,
        event => {
          if (emojiPickerOpen.current || mentionsOpen.current) {
            // we don't want to send if the user is currently picking an emoji or mention
            return false;
          }
          if (event?.shiftKey) {
            return true;
          }

          onSend();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );

    onSetup?.(editor);
  };

  useEffect(() => {
    return cleanupRef.current;
  });

  useEffect(() => {
    if (editedMessage && editorRef.current) {
      editorRef.current.update(() => {
        const root = $getRoot();
        // Replace the current root with the content of the message being edited
        root.append(toEditorNodes(editedMessage));
        // This behaviour is needed to clear selection, if we not clear selection will be on beginning.
        $setSelection(null);
        editorRef.current?.focus();
      });
    }
  }, [editedMessage]);

  const [shouldReplaceEmoji, setShouldReplaceEmoji] = useState<boolean>(
    propertiesRepository.getPreference(PROPERTIES_TYPE.EMOJI.REPLACE_INLINE),
  );

  const editorConfig: InitialConfigType = {
    namespace: 'WireLexicalEditor',
    theme,
    onError(error: unknown) {
      logger.error(error);
    },
    nodes: [MentionNode, EmojiNode],
  };

  const searchMentions = (queryString?: string | null) => {
    return typeof queryString === 'string' ? searchRepository.searchUserInSet(queryString, mentionCandidates) : [];
  };

  const saveDraft = (editorState: EditorState) => {
    saveDraftState(JSON.stringify(editorState.toJSON()));
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE, setShouldReplaceEmoji);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, (properties: WebappProperties) => {
      setShouldReplaceEmoji(properties.settings.emoji.replace_inline);
    });
  }, []);

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="controls-center">
        <div className="input-bar--wrapper">
          <AutoFocusPlugin />
          <GlobalEventsPlugin onShiftTab={onShiftTab} />
          <EditorRefPlugin editorRef={setupEditor} />
          <DraftStatePlugin loadDraftState={loadDraftState} />
          <EditMessagePlugin onMessageEdit={editMessage} />

          <EmojiPickerPlugin openStateRef={emojiPickerOpen} />
          <HistoryPlugin />

          {shouldReplaceEmoji && <ReplaceEmojiPlugin />}

          <PlainTextPlugin
            contentEditable={<ContentEditable className="conversation-input-bar-text" data-uie-name="input-message" />}
            placeholder={<Placeholder text={placeholder} hasLocalEphemeralTimer={hasLocalEphemeralTimer} />}
            ErrorBoundary={LexicalErrorBoundary}
          />

          <MentionsPlugin onSearch={searchMentions} openStateRef={mentionsOpen} />

          <OnChangePlugin onChange={saveDraft} />
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
