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

import {$isAtNodeEnd} from '@lexical/selection';
import {ElementNode, RangeSelection, TextNode} from 'lexical';

/**
 * Gets the most relevant node from a text selection to determine link context.
 * Used for:
 * 1. Finding if selected text is already part of a link when formatting
 * 2. Detecting if a clicked element is part of a link node
 *
 * For example, when user clicks on a link or selects text:
 * ```ts
 * const node = getSelectedNode(selection);
 * const linkNode = $findMatchingParent(node, $isLinkNode);
 * ```
 *  linkNode will be the parent LinkNode if text is part of a link
 *  or null if text is not linked
 *
 * @param selection - Current text selection in the editor
 * @returns The node that should be checked for link context
 */
export const getSelectedNode = (selection: RangeSelection): TextNode | ElementNode => {
  const {anchor, focus, isBackward} = selection;

  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();

  if (anchorNode === focusNode) {
    return anchorNode;
  }

  if (isBackward()) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  }
  return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
};
