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

import {useEffect} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import cx from 'classnames';
import {$getRoot, $nodesOfType, COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND, type LexicalEditor} from 'lexical';

import {Icon} from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {User} from '../../../../entity/User';
import {MentionEntity} from '../../../../message/MentionEntity';
import {MentionNode} from '../../nodes/MentionNode';

const createMentionEntity = (user: Pick<User, 'id' | 'name' | 'domain'>, mentionPosition: number): MentionEntity => {
  const userName = user.name();
  const mentionLength = userName.length + 1;

  return new MentionEntity(mentionPosition, mentionLength, user.id, user.domain);
};

interface SendMessageButtonProps {
  textValue: string;
  onSend: (message: string, mentions: MentionEntity[]) => void;
  mentions: User[];
}

export const getMentionsToSend = (editor: LexicalEditor, textValue: string, mentions: User[]) => {
  const currentMentions = editor.getEditorState().read(() => $nodesOfType(MentionNode).map(node => node.__value));

  const mentionEntities: MentionEntity[] = [];
  let position = -1;

  currentMentions.forEach(mention => {
    const mentionPosition = textValue.indexOf(`@${mention}`, position + 1);
    const mentionOption = mentions.find(user => user.name() === mention);

    if (mentionOption) {
      mentionEntities.push(createMentionEntity(mentionOption, mentionPosition));
    }

    position = mentionPosition;
  });

  return mentionEntities;
};

export const SendMessageButton = ({textValue, onSend, mentions}: SendMessageButtonProps) => {
  const [editor] = useLexicalComposerContext();

  const handleSendMessage = () => {
    const mentionEntities = getMentionsToSend(editor, textValue, mentions);

    onSend(textValue, mentionEntities);

    editor.update(() => {
      $getRoot().clear();
    });
  };

  useEffect(() => {
    const removeListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      event => {
        const isMentionsDropdownActive = document.querySelector('.conversation-input-bar-mention-suggestion');
        const isEmojisDropdownActive = document.querySelector('.emoji-menu');

        if (isMentionsDropdownActive || isEmojisDropdownActive) {
          return false;
        }

        if (event?.shiftKey) {
          return true;
        }

        handleSendMessage();

        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      removeListener();
    };
  }, [editor, mentions, onSend, textValue]);

  return (
    <button
      type="button"
      className={cx('controls-right-button controls-right-button--send')}
      disabled={textValue.length === 0}
      title={t('tooltipConversationSendMessage')}
      aria-label={t('tooltipConversationSendMessage')}
      data-uie-name="do-send-message"
      onClick={() => handleSendMessage()}
    >
      <Icon.Send />
    </button>
  );
};
