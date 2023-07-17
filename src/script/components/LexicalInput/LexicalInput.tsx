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

import {forwardRef, useEffect, useState} from 'react';

import {InitialConfigType, LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import type {WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';
import cx from 'classnames';
import {LexicalEditor} from 'lexical';

import {WebAppEvents} from '@wireapp/webapp-events';

import {SendMessageButton} from 'Components/LexicalInput/components/SendMessageButton';
import {BeautifulMentionsPlugin, MenuOption} from 'Components/LexicalInput/plugins/BeautifulMentionsPlugin';
import {
  BeautifulMentionsMenuItemProps,
  BeautifulMentionsMenuProps,
} from 'Components/LexicalInput/types/BeautifulMentionsPluginProps';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {BeautifulMentionNode} from './nodes/MentionNode';
import {DraftStatePlugin} from './plugins/DraftStatePlugin';
import {EmojiPickerPlugin} from './plugins/EmojiPickerPlugin';
import './tempStyle.less';

import {MessageRepository} from '../../conversation/MessageRepository';
import {Conversation} from '../../entity/Conversation';
import {MentionEntity} from '../../message/MentionEntity';
import {PropertiesRepository} from '../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../properties/PropertiesType';
import {SearchRepository} from '../../search/SearchRepository';

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  beautifulMentions: {
    '@': `at-beautiful-mentions`, // use the trigger name as the key
    '@Focused': 'focused-beautiful-mentions', // add the "Focused" suffix to style the focused mention
  },
};

const Menu = forwardRef<HTMLUListElement, BeautifulMentionsMenuProps>(({open, loading, ...props}, ref) => (
  <ul className="mention-suggestion-list" {...props} ref={ref} />
));

Menu.displayName = 'Menu';

const MenuItem = forwardRef<HTMLLIElement, BeautifulMentionsMenuItemProps>(({selected, ...props}, ref) => (
  <li
    className={`mention-suggestion-list__item ${selected ? 'mention-suggestion-list__item--highlighted' : ''}`}
    {...props}
    ref={ref}
  />
));

MenuItem.displayName = 'MenuItem';

interface LexicalInputProps {
  readonly conversationEntity: Conversation;
  currentMentions: MentionEntity[];
  readonly messageRepository: MessageRepository;
  readonly propertiesRepository: PropertiesRepository;
  readonly searchRepository: SearchRepository;
  placeholder: string;
  inputValue: string;
  setInputValue: (text: string) => void;
  editMessage: (messageEntity: ContentMessage, editor: LexicalEditor) => void;
  children: any;
  sendMessage: any;
  hasLocalEphemeralTimer: boolean;
  saveDraftStateLexical: any;
  loadDraftStateLexical: any;
}

export const LexicalInput = ({
  conversationEntity,
  messageRepository,
  placeholder,
  propertiesRepository,
  searchRepository,
  inputValue,
  setInputValue,
  children,
  sendMessage,
  hasLocalEphemeralTimer,
  saveDraftStateLexical,
  loadDraftStateLexical,
  editMessage,
}: LexicalInputProps) => {
  // Emojis
  const [shouldReplaceEmoji, setShouldReplaceEmoji] = useState<boolean>(
    propertiesRepository.getPreference(PROPERTIES_TYPE.EMOJI.REPLACE_INLINE),
  );

  // Mentions
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentMentions, setCurrentMentions] = useState<MenuOption[]>([]);
  const {participating_user_ets: participatingUserEts} = useKoSubscribableChildren(conversationEntity, [
    'participating_user_ets',
  ]);
  const candidates = participatingUserEts.filter(userEntity => !userEntity.isService);

  const editorConfig: InitialConfigType = {
    namespace: 'WireLexicalEditor',
    theme,
    onError(error: any) {
      // eslint-disable-next-line no-console
      console.log('[LexicalInput.tsx] przemvs error', error);
      throw error;
    },
    nodes: [BeautifulMentionNode, BeautifulMentionNode],
    // editorState: initEditor,
    // editorState: text,
  };

  const queryMentions = (_trigger: string, queryString?: string | null) => {
    return queryString ? searchRepository.searchUserInSet(queryString, candidates) : [];
  };

  const addMention = (mention: MenuOption) => {
    setCurrentMentions(prevState => [...prevState, mention]);
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE, setShouldReplaceEmoji);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, (properties: WebappProperties) => {
      setShouldReplaceEmoji(properties.settings.emoji.replace_inline);
    });
  }, []);

  function RenameMeLaterPlaseOrMoveMe() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
      amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.EDIT, (messageEntity: ContentMessage) => {
        editMessage(messageEntity, editor);
      });
      return () => {
        amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.EDIT);
      };
    }, [editor]);

    return null;
  }

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="controls-center">
        <div css={{width: '100%'}} className={cx('input-bar--wrapper')}>
          <div className="editor-container">
            {/* Connect this with DraftStateUtil.ts */}
            <DraftStatePlugin setInputValue={setInputValue} loadDraftStateLexical={loadDraftStateLexical} />
            <RenameMeLaterPlaseOrMoveMe />

            {shouldReplaceEmoji && <EmojiPickerPlugin />}

            <PlainTextPlugin
              contentEditable={<ContentEditable value={inputValue} className="editor-input" />}
              placeholder={<Placeholder text={placeholder} hasLocalEphemeralTimer={hasLocalEphemeralTimer} />}
              ErrorBoundary={LexicalErrorBoundary}
            />

            <BeautifulMentionsPlugin
              onSearch={queryMentions}
              onAddMention={addMention}
              triggers={['@']}
              menuComponent={Menu}
              menuItemComponent={MenuItem}
            />

            <OnChangePlugin
              onChange={(editorState, lexicalEditor) => {
                lexicalEditor.registerTextContentListener(textContent => {
                  setInputValue(textContent);
                });

                const stringifyEditor = JSON.stringify(editorState.toJSON());
                saveDraftStateLexical(stringifyEditor);
              }}
            />
          </div>
        </div>
      </div>

      {children}

      <SendMessageButton textValue={inputValue} onSend={sendMessage} mentions={candidates} />
    </LexicalComposer>
  );
};

LexicalInput.displayName = 'LexicalInput';

function Placeholder({text, hasLocalEphemeralTimer}: {text: string; hasLocalEphemeralTimer: boolean}) {
  return (
    <div className={cx('editor-placeholder', {'conversation-input-bar-text--accent': hasLocalEphemeralTimer})}>
      {text}
    </div>
  );
}
