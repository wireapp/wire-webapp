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
import {$getRoot, $setSelection} from 'lexical';

import {ContentMessage} from 'src/script/entity/message/ContentMessage';

import {toEditorNodes} from '../utils/messageToEditorNodes';

type Props = {
  message?: ContentMessage;
};
export function EditedMessagePlugin({message}: Props): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (message) {
      // Need to timeout to be sure the editor is in a state to receive the new message (could cause problems with cursor position)
      setTimeout(() => {
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          // This behaviour is needed to clear selection, if we not clear selection will be on beginning.
          $setSelection(null);
          // Replace the current root with the content of the message being edited
          root.append(toEditorNodes(message));
          editor.focus();
        });
      });
    }
  }, [editor, message]);

  return null;
}
