/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {$createParagraphNode, $createTextNode} from 'lexical';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {Text} from 'Repositories/entity/message/Text';

import {$createMentionNode} from '../../../nodes/MentionNode';
import {createNodes} from '../../../utils/generateNodes';

export const getRawMarkdownNodesWithMentions = (message: ContentMessage) => {
  const firstAsset = message.getFirstAsset() as Text;
  const newMentions = firstAsset.mentions().slice();
  const nodes = createNodes(newMentions, firstAsset.text);

  const paragraphs = nodes.map(node => {
    if (node.type === 'Mention') {
      return $createMentionNode('@', node.data.slice(1));
    }

    return $createTextNode(node.data);
  });

  const paragraphNode = $createParagraphNode();
  paragraphNode.append(...paragraphs);
  return paragraphNode;
};
