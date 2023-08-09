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

import {useCallback, useEffect, useState, ReactElement} from 'react';

import {InitialConfigType, LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {EditorRefPlugin} from '@lexical/react/LexicalEditorRefPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import type {WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';
import cx from 'classnames';
import {LexicalEditor, EditorState} from 'lexical';

import {WebAppEvents} from '@wireapp/webapp-events';

import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {User} from 'src/script/entity/User';
import {DraftState} from 'Util/DraftStateUtil';
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
    '@Focused': 'focused-mentions', // add the "Focused" suffix to style the focused mention
  },
};

const logger = getLogger('LexicalInput');

interface LexicalInputProps {
  currentMentions: MentionEntity[];
  readonly propertiesRepository: PropertiesRepository;
  readonly searchRepository: SearchRepository;
  placeholder: string;
  inputValue: string;
  setInputValue: (text: string) => void;
  editMessage: (messageEntity: ContentMessage, editor: LexicalEditor) => void;
  children: ReactElement;
  hasLocalEphemeralTimer: boolean;
  saveDraftState: (editor: string) => void;
  loadDraftState: () => Promise<DraftState>;
  mentionCandidates: User[];
  onShiftTab: () => void;
  onSetup?: (editor: LexicalEditor) => void;
}

export const LexicalInput = ({
  placeholder,
  propertiesRepository,
  searchRepository,
  inputValue,
  setInputValue,
  children,
  hasLocalEphemeralTimer,
  saveDraftState,
  loadDraftState,
  editMessage,
  mentionCandidates,
  onShiftTab,
  onSetup,
}: LexicalInputProps) => {
  // Emojis
  const [shouldReplaceEmoji, setShouldReplaceEmoji] = useState<boolean>(
    propertiesRepository.getPreference(PROPERTIES_TYPE.EMOJI.REPLACE_INLINE),
  );

  const editorConfig: InitialConfigType = {
    namespace: 'WireLexicalEditor',
    theme,
    onError(error: unknown) {
      logger.error(error);
      throw error;
    },
    nodes: [MentionNode, EmojiNode],
  };

  const searchMentions = (queryString?: string | null) => {
    return queryString ? searchRepository.searchUserInSet(queryString, mentionCandidates) : mentionCandidates;
  };

  const updateValue = useCallback(
    (editorState: EditorState, lexicalEditor: LexicalEditor) => {
      lexicalEditor.registerTextContentListener(textContent => {
        setInputValue(textContent);
      });

      const stringifyEditor = JSON.stringify(editorState.toJSON());
      saveDraftState(stringifyEditor);
    },
    [saveDraftState, setInputValue],
  );

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
          {onSetup && <EditorRefPlugin editorRef={onSetup} />}
          <DraftStatePlugin setInputValue={setInputValue} loadDraftState={loadDraftState} />
          <EditMessagePlugin onMessageEdit={editMessage} />

          <EmojiPickerPlugin />
          <HistoryPlugin />

          {shouldReplaceEmoji && <ReplaceEmojiPlugin />}

          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                value={inputValue}
                className="conversation-input-bar-text"
                data-uie-name="input-message"
              />
            }
            placeholder={<Placeholder text={placeholder} hasLocalEphemeralTimer={hasLocalEphemeralTimer} />}
            ErrorBoundary={LexicalErrorBoundary}
          />

          <MentionsPlugin onSearch={searchMentions} />

          <OnChangePlugin onChange={updateValue} />
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
