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

import {ElementNode, TextNode} from 'lexical';

export const isNodeList = (node: TextNode | ElementNode | null, listType: 'ordered' | 'unordered'): boolean => {
  if (!node) {
    return false;
  }

  const tag = listType === 'ordered' ? 'ol' : 'ul';

  // @ts-expect-error: `getTag` is not specified in the type definition, but it exists
  if (node.getType() === 'list' && node.getTag() === tag) {
    return true;
  }

  return isNodeList(node.getParent(), listType);
};
