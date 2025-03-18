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

import {$createHeadingNode} from '@lexical/rich-text';
import {$getSelection, $isRangeSelection} from 'lexical';

export const headingCommand = () => {
  const selection = $getSelection();

  if ($isRangeSelection(selection)) {
    // Leaving "h1" instead of dynamic heading level selection
    // As long as we don't support other types (via rich text editor buttons), this is fine
    const headingNode = $createHeadingNode('h1');

    const node = selection.anchor.getNode();
    const parent = node.getParent();

    if (!parent || parent.getType() === 'root') {
      return false;
    }

    parent.replace(headingNode);
    headingNode.append(...selection.extract());
  }

  return true;
};
