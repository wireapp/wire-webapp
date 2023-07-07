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

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import cx from 'classnames';
import {$getRoot, $nodesOfType, COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND, type LexicalEditor} from 'lexical';

import {Icon} from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {User} from '../../../../entity/User';
import {MentionEntity} from '../../../../message/MentionEntity';
import {BeautifulMentionNode} from '../../nodes/MentionNode';

const createMentionEntity = (
  user: Pick<User, 'id' | 'name' | 'domain'>,
  mentionPosition: number,
): MentionEntity | null => {
  const userName = user.name();
  const mentionLength = userName.length + 1;

  if (mentionPosition) {
    return new MentionEntity(mentionPosition, mentionLength, user.id, user.domain);
  }

  return null;
};

interface SendMessageButtonProps {
  textValue: string;
  onSend: any;
  mentions: User[];
}

export const getMentionsToSend = (editor: LexicalEditor, textValue: string, mentions: User[]) => {
  const currentMentions = editor
    .getEditorState()
    .read(() => $nodesOfType(BeautifulMentionNode).map(node => node.__value));

  const mentionEntities: MentionEntity[] = [];
  let position = -1;

  currentMentions.forEach(mention => {
    const mentionPosition = textValue.indexOf(`@${mention}`, position + 1);
    const mentionOption = mentions.find(user => user.name() === mention);

    if (mentionOption) {
      const newMention = createMentionEntity(mentionOption, mentionPosition);

      if (newMention) {
        mentionEntities.push(newMention);
      }
    }

    position = mentionPosition;
  });

  return mentionEntities;
};

export const SendMessageButton = ({textValue, onSend, mentions}: SendMessageButtonProps) => {
  const [editor] = useLexicalComposerContext();

  editor.registerCommand(
    KEY_ENTER_COMMAND,
    event => {
      const mentionEntities = getMentionsToSend(editor, textValue, mentions);

      onSend(textValue, mentionEntities);
      editor.update(() => {
        $getRoot().clear();
      });
      return false;
    },
    COMMAND_PRIORITY_LOW,
  );

  return (
    <button
      type="button"
      className={cx('controls-right-button controls-right-button--send')}
      disabled={textValue.length === 0}
      title={t('tooltipConversationSendMessage')}
      aria-label={t('tooltipConversationSendMessage')}
      data-uie-name="do-send-message"
      onClick={() => {
        const mentionEntities = getMentionsToSend(editor, textValue, mentions);

        onSend(textValue, mentionEntities);

        editor.update(() => {
          $getRoot().clear();
        });
      }}
    >
      <Icon.Send />
    </button>
  );
};
