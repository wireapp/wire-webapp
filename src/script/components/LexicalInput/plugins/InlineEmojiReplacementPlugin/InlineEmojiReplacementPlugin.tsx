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
import {TextNode} from 'lexical';

import {isSpaceKey, isTabKey} from 'Util/KeyboardUtil';

import {inlineReplacements} from './inlineReplacements';

const escapeRegexp = (string: string): string => string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const emojiList = inlineReplacements.map(emoji => {
  const emoticons = emoji.emoticons || [];

  return {
    ...emoji,
    regexes: emoticons.map(emojiIcon => new RegExp(`(?:^|\\s)${escapeRegexp(emojiIcon)}(?=\\s|$)`)),
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

// Store the last text node text to avoid unnecessary work
let lastTextNodeText: string = '';
// Store words that don't have emojis to avoid unnecessary work
const wordsWithoutEmojis = new Set<string>();
// Regex to check if a word is an possible emoticon
const possibleEmoticons = /^[^\w\s][\w\W_]*$/;
// Checking if space or tab key pressed to replace emoji
let isSpaceOrTabKeyPressed = false;

export function ReplaceEmojiPlugin(): null {
  const [editor] = useLexicalComposerContext();

  editor.registerNodeTransform(TextNode, newNode => {
    const hasNewContent = lastTextNodeText !== newNode.getTextContent();

    if (isSpaceOrTabKeyPressed && (!lastTextNodeText || hasNewContent)) {
      lastTextNodeText = `${newNode.getTextContent()}`;
      // Collect new words
      const wordArray = lastTextNodeText.split(' ').filter(word => !wordsWithoutEmojis.has(word));

      // Check if there are words with possible emojis
      if (wordArray.some(word => possibleEmoticons.test(word))) {
        const transformedText = findAndTransformEmoji(lastTextNodeText);

        if (transformedText !== null && transformedText.length > 0) {
          newNode.setTextContent(transformedText);
          lastTextNodeText = transformedText;
        } else {
          // Add words to the set to avoid unnecessary work
          wordArray.forEach(word => wordsWithoutEmojis.add(word));
        }
      }
    }
  });

  const onKeyDown = (event: KeyboardEvent) => {
    isSpaceOrTabKeyPressed = isSpaceKey(event) || isTabKey(event);
  };

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [editor]);

  return null;
}
