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
import {amplify} from 'amplify';
import {COMMAND_PRIORITY_LOW, KEY_ESCAPE_COMMAND} from 'lexical';

import {WebAppEvents} from '@wireapp/webapp-events';

import {ContentMessage} from '../../../entity/message/ContentMessage';

interface EditMessageProps {
  onMessageEdit: (messageEntity: ContentMessage | undefined) => void;
}

export function EditMessagePlugin({onMessageEdit}: EditMessageProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        onMessageEdit(undefined);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.EDIT, (messageEntity: ContentMessage) => {
      onMessageEdit(messageEntity);
    });

    return () => {
      unregister();
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.EDIT);
    };
  }, [editor]);

  return null;
}
