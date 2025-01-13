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

import {TextMatchTransformer} from '@lexical/markdown';

import {$createMentionNode, $isMentionNode, MentionNode} from '../../../nodes/MentionNode';

// Cutom transformer for handling mentions when converting markdown to editor format.
// Based on https://github.com/facebook/lexical/blob/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L489
// It takes mentions from the markdown (e.g. <mention>@John Doe</mention>) and converts them to MentionNodes.
export const getMentionMarkdownTransformer = (allowedMentions: Array<string>): TextMatchTransformer => {
  return {
    dependencies: [MentionNode],
    export: node => {
      if (!$isMentionNode(node)) {
        return null;
      }
      return `<mention>${node.getTextContent()}</mention>`;
    },
    importRegExp: /<mention>([^<]+)<\/mention>/,
    regExp: /<mention>([^<]+)<\/mention>/,
    replace: (textNode, match) => {
      const mentionText = match[1];

      if (!allowedMentions.includes(mentionText)) {
        return;
      }

      const mentionNode = $createMentionNode('@', mentionText.slice(1));
      textNode.replace(mentionNode);
    },
    trigger: ' ',
    type: 'text-match',
  };
};
