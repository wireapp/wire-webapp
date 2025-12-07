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

import {$convertFromMarkdownString} from '@lexical/markdown';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getRoot, $setSelection} from 'lexical';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';

import {getMentionMarkdownTransformer} from './getMentionMarkdownTransformer/getMentionMarkdownTransformer';
import {getMentionNodesFromMessage} from './getMentionNodesFromMessage/getMentionNodesFromMessage';
import {getRawMarkdownNodesWithMentions} from './getRawMarkdownFromMessage/getRawMarkdownFromMessage';
import {wrapMentionsWithTags} from './wrapMentionsWithTags/wrapMentionsWithTags';

import {markdownTransformers} from '../../utils/markdownTransformers';

type Props = {
  message?: ContentMessage;
  showMarkdownPreview: boolean;
};

export function EditedMessagePlugin({message, showMarkdownPreview}: Props): null {
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

          if (!showMarkdownPreview) {
            const rawMarkdownNodes = getRawMarkdownNodesWithMentions(message);
            root.append(rawMarkdownNodes);
            return;
          }

          const messageContent = message.getFirstAsset().text;

          const mentionNodes = getMentionNodesFromMessage(message);

          const allowedMentions = [...new Set(mentionNodes.map(node => node.getTextContent()))];

          const wrappedWithTags = wrapMentionsWithTags(messageContent, allowedMentions);

          const mentionMarkdownTransformer = getMentionMarkdownTransformer(allowedMentions);

          // Text comes from the message is in the raw markdown format, we need to convert it to the editor format (preview), display **bold** as bold, etc.
          // The below function do that by getting the text, and transofrming it to the desired format.
          // During the transformation, we have to tell the editor to transofrm mentions as well.
          // We can't do that by diretcly updating the $root (e.g. $root.appent(...MentionNodes)), because this function will overwrite the result.
          // One way of overcoming this issue is to use a custom transformer (quite a hacky way). Transformers are responisble for converting the text to the desired format (e.g. **bold** to bold).
          $convertFromMarkdownString(
            wrappedWithTags,
            [mentionMarkdownTransformer, ...markdownTransformers],
            undefined,
            true,
          );

          editor.focus();
        });
      });
    }
  }, [editor, message, showMarkdownPreview]);

  return null;
}
