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
import {COMMAND_PRIORITY_LOW, KEY_ARROW_UP_COMMAND, KEY_ESCAPE_COMMAND} from 'lexical';

interface EditMessageProps {
  onEditLastSentMessage: () => void;
  onCancelMessageEdit: () => void;
}

export function EditMessagePlugin({onEditLastSentMessage, onCancelMessageEdit}: EditMessageProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          onCancelMessageEdit();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        () => {
          onEditLastSentMessage();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, onCancelMessageEdit, onEditLastSentMessage]);

  return null;
}
