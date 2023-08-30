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
import {COMMAND_PRIORITY_LOW, KEY_SPACE_COMMAND, TextNode} from 'lexical';

import {inlineReplacements} from './inlineReplacements';

const escapeRegexp = (string: string): string => string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const emojiList = inlineReplacements.map(emoji => {
  const emoticons = emoji.emoticons || [];

  return {
    ...emoji,
    regexes: emoticons.map(emojiIcon => new RegExp(`(^|\\s)${escapeRegexp(emojiIcon)}(?=\\s|$)`)),
  };
});

export function findAndTransformEmoji(text: string): string {
  for (const emoji of emojiList) {
    for (const regex of emoji.regexes) {
      if (!regex.test(text)) {
        continue;
      }

      return text.replace(regex, `$1${emoji.emoji}`);
    }
  }

  return text;
}

function transformEmojiNodes(textNode: TextNode): void {
  const text = textNode.getTextContent();
  textNode.setTextContent(findAndTransformEmoji(text));
}

export function ReplaceEmojiPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = mergeRegister(
      editor.registerCommand(
        KEY_SPACE_COMMAND,
        () => {
          const unregister = editor.registerNodeTransform(TextNode, newNode => {
            transformEmojiNodes(newNode);
            // We register a text transform listener for a single round when the space key is pressed (then the listener is released)
            unregister();
          });
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );

    return unregister;
  }, [editor]);
  return null;
}
