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
import {COMMAND_PRIORITY_LOW, INSERT_PARAGRAPH_COMMAND, KEY_ENTER_COMMAND} from 'lexical';
import {Config} from 'src/script/Config';

type Props = {
  onSend: () => void;
};

export function SendPlugin({onSend}: Props): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      event => {
        if (!event) {
          return false;
        }

        // Mimic the "Enter" behavior when a user press "Shift + Enter"
        // It's useful for the rich text editor, especially when creating lists
        if (event.shiftKey) {
          const messageFormatButtonsEnabled = Config.getConfig().FEATURE.ENABLE_MESSAGE_FORMAT_BUTTONS;

          if (messageFormatButtonsEnabled) {
            event.preventDefault();
            return editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
          }

          return true;
        }

        // When sending a message with "Enter", we want to prevent the default behavior (new line)
        event.preventDefault();
        onSend();

        // By returning true, we tell the editor that we've handled the event and it should stop propagation (only for the same command priority level)
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onSend]);

  return null;
}
