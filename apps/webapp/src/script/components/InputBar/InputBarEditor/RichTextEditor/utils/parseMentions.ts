/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {LexicalEditor, $nodesOfType} from 'lexical';
import {User} from 'Repositories/entity/User';
import {MentionEntity} from 'src/script/message/MentionEntity';

import {MentionNode} from '../nodes/MentionNode';

export const parseMentions = (editor: LexicalEditor, textValue: string, mentions: User[]) => {
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

const createMentionEntity = (user: Pick<User, 'id' | 'name' | 'domain'>, mentionPosition: number): MentionEntity => {
  const userName = user.name();
  const mentionLength = userName.length + 1;

  return new MentionEntity(mentionPosition, mentionLength, user.id, user.domain);
};
