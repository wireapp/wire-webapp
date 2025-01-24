/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {CodeHighlightNode, CodeNode} from '@lexical/code';
import {LinkNode, AutoLinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {InitialConfigType} from '@lexical/react/LexicalComposer';
import {HorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';

import {getLogger} from 'Util/Logger';

import {EmojiNode} from './nodes/EmojiNode';
import {MentionNode} from './nodes/MentionNode';
import {theme} from './theme';

const logger = getLogger('LexicalInput');

export const editorConfig: InitialConfigType = {
  namespace: 'WireLexicalEditor',
  theme,
  onError(error: unknown) {
    logger.error(error);
  },
  nodes: [
    MentionNode,
    EmojiNode,
    ListItemNode,
    ListNode,
    HeadingNode,
    HorizontalRuleNode,
    QuoteNode,
    CodeNode,
    CodeHighlightNode,
    QuoteNode,
    LinkNode,
    AutoLinkNode,
  ],
};
