/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useCallback, useEffect} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH, PASTE_COMMAND} from 'lexical';

export const PlainTextPastePlugin = (): null => {
  const [editor] = useLexicalComposerContext();

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const plainText = event.clipboardData?.getData('text/plain');

      if (plainText === undefined) {
        return false;
      }

      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          selection.insertText(plainText);
        }
      });

      event.preventDefault();
      return true;
    },
    [editor],
  );

  useEffect(() => {
    return editor.registerCommand(PASTE_COMMAND, handlePaste, COMMAND_PRIORITY_HIGH);
  }, [editor, handlePaste]);

  return null;
};
