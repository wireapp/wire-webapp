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

import {TextMatchTransformer} from '@lexical/markdown';
import {$isTextNode, TextNode} from 'lexical';

const URL_TOKEN_PATTERN = /(https?:\/\/[^\s)]+)/g;

const normalizeEscapedUnderscoresInUrls = (markdown: string): string => {
  return markdown.replace(URL_TOKEN_PATTERN, urlToken => urlToken.replace(/\\_/g, '_'));
};

export const TEXT_WITH_UNESCAPED_URL_UNDERSCORES: TextMatchTransformer = {
  dependencies: [TextNode],
  export: (node, _exportChildren, exportFormat) => {
    if (!$isTextNode(node)) {
      return null;
    }

    const escapedText = exportFormat(node, node.getTextContent());
    return normalizeEscapedUnderscoresInUrls(escapedText);
  },
  regExp: /$^/,
  type: 'text-match',
};
