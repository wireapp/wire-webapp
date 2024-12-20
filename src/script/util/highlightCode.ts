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

import Prism from 'prismjs';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-csv';
import 'prismjs/components/prism-haskell';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-regex';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-yaml';

interface HighlightCodeParams {
  code: string;
  grammar: Prism.Grammar;
  lang: string;
}

export const highlightCode = ({code, grammar, lang}: HighlightCodeParams) => {
  // eslint-disable-next-line import/no-named-as-default-member
  return Prism.highlight(code, grammar, lang);
};

// eslint-disable-next-line import/no-named-as-default-member
export const languages = Prism.languages;
