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

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {Text} from 'Repositories/entity/message/Text';

import {$createMentionNode, MentionNode} from '../../../nodes/MentionNode';
import {createNodes} from '../../../utils/generateNodes';

export const getMentionNodesFromMessage = (message: ContentMessage): MentionNode[] => {
  const firstAsset = message.getFirstAsset() as Text;
  const newMentions = firstAsset.mentions().slice();
  const nodes = createNodes(newMentions, firstAsset.text);

  return nodes.filter(node => node.type === 'Mention').map(node => $createMentionNode('@', node.data.slice(1)));
};
