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
import {emoticon} from 'emoticon';
import {TextNode} from 'lexical';

const escapeRegexp = (string: string): string => string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const emojiList = emoticon.map(emoji => {
  const emoticons = emoji.emoticons || [];

  return {
    ...emoji,
    regexes: emoticons.map(emoticon => new RegExp(`(?:^|\\s)${escapeRegexp(emoticon)}(?=\\s|$)`)),
  };
});

function findAndTransformEmoji(text: string): string | null {
  for (const emoji of emojiList) {
    for (const regex of emoji.regexes) {
      if (!regex.test(text)) {
        continue;
      }
      return text.replace(regex, ` ${emoji.emoji}`);
    }
  }

  return null;
}

let lastTextNodeText: string = '';

export function ReplaceEmojiPlugin(): null {
  const [editor] = useLexicalComposerContext();

  editor.registerNodeTransform(TextNode, newNode => {
    const hasNewContent = lastTextNodeText !== newNode.getTextContent();
    if (!lastTextNodeText || hasNewContent) {
      lastTextNodeText = `${newNode.getTextContent()}`;
      const transformedText = findAndTransformEmoji(lastTextNodeText);
      if (transformedText !== null && transformedText.length > 0) {
        newNode.setTextContent(transformedText);
        lastTextNodeText = transformedText;
      }
    }
  });

  return null;
}
