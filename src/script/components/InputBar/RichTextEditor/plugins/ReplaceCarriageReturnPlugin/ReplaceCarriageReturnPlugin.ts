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

import {useEffect} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {COMMAND_PRIORITY_LOW, PASTE_COMMAND, TextNode} from 'lexical';

function replaceCarriageReturnWithLineFeed(input: string) {
  // ASCII code for Carriage Return ("\r") is 13
  return input
    .split('')
    .map(char => (char.charCodeAt(0) === 13 ? '\n' : char))
    .join('');
}

export const ReplaceCarriageReturnPlugin = (): null => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        PASTE_COMMAND,
        () => {
          const unregister = editor.registerNodeTransform(TextNode, newNode => {
            newNode.setTextContent(replaceCarriageReturnWithLineFeed(newNode.getTextContent()));
            unregister();
          });
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  return null;
};
