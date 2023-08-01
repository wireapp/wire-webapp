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
import {mergeRegister} from '@lexical/utils';
import {
  TextNode,
  KEY_SPACE_COMMAND,
  KEY_TAB_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  $getSelection,
  RangeSelection,
} from 'lexical';

import {$createEmojiNode, EmojiNode} from '../nodes/EmojiNode';
import {EmojiInlineReplacements, inlineReplacements} from '../utils/inlineReplacements';

const inlineReplacement: EmojiInlineReplacements = new Map(
  [...inlineReplacements].sort(([firstShortcut], [secondShortcut]) => {
    const isUnequalLength = firstShortcut.length !== secondShortcut.length;

    return isUnequalLength ? secondShortcut.length - firstShortcut.length : firstShortcut.localeCompare(secondShortcut);
  }),
);

const inlineReplacementArray = Array.from(inlineReplacement.keys());
const INLINE_MAX_LENGTH = Math.max(...inlineReplacementArray.map(shortcut => shortcut.length));

const escapeRegexp = (string: string): string => string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

function findAndTransformEmoji(node: TextNode): null | TextNode {
  const text = node.getTextContent();
  const selection = $getSelection();
  const currentFocusSelection = (selection as RangeSelection)?.anchor?.offset || 0;

  if (!text) {
    return null;
  }

  const textUntilCursor = text.substring(
    Math.max(0, currentFocusSelection - INLINE_MAX_LENGTH - 1),
    currentFocusSelection,
  );

  for (const [replacement, [className, emojiIcon]] of inlineReplacement) {
    const validInlineEmojiRegEx = new RegExp(`(^|\\s)${escapeRegexp(replacement)}$`);
    let targetNode;

    if (validInlineEmojiRegEx.test(textUntilCursor)) {
      const positionAfterText = currentFocusSelection - replacement.length;

      if (positionAfterText === 0) {
        [targetNode] = node.splitText(positionAfterText);
      } else if (currentFocusSelection === text.length) {
        [, targetNode] = node.splitText(positionAfterText, currentFocusSelection);
      } else {
        [, targetNode] = node.splitText(currentFocusSelection, positionAfterText);
      }

      const emojiNode = $createEmojiNode(className, emojiIcon);
      targetNode.replace(emojiNode);
      return null;
    }
  }

  return null;
}

// function findAndTransformEmojiT(node: TextNode): null | TextNode {
//   const text = node.getTextContent();
//
//   for (let index = 0; index < text.length; index++) {
//     const normal = inlineReplacements.get(text[index]);
//     const slicedEmojiData = inlineReplacements.get(text.slice(index, index + 2));
//     const emojiData = normal || slicedEmojiData;
//
//     if (emojiData !== undefined) {
//       const [emojiStyle, emojiText] = emojiData;
//       let targetNode;
//
//       if (index === 0) {
//         [targetNode] = node.splitText(index + 2);
//       } else {
//         [, targetNode] = node.splitText(index, index + 2);
//       }
//
//       const emojiNode = $createEmojiNode(emojiStyle, emojiText);
//       targetNode.replace(emojiNode);
//       return emojiNode;
//     }
//   }
//
//   return null;
// }

const textNodeTransform = (node: TextNode) => {
  let targetNode: TextNode | null = node;

  // console.log('[ReplaceEmojiPlugin.tsx] przemvs targetNode', targetNode);

  while (targetNode !== null) {
    if (!targetNode.isSimpleText()) {
      return;
    }

    targetNode = findAndTransformEmoji(targetNode);
  }
};

export function ReplaceEmojiPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([EmojiNode])) {
      throw new Error('EmojisPlugin: EmojiNode not registered on editor');
    }

    const onEmojiReplace = () => editor.registerNodeTransform(TextNode, textNodeTransform);

    return mergeRegister(
      editor.registerCommand(
        KEY_SPACE_COMMAND,
        (event: KeyboardEvent) => {
          onEmojiReplace();
          return false;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event: KeyboardEvent) => {
          onEmojiReplace();
          // Handle enter key presses here
          return false;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor]);

  return null;
}
