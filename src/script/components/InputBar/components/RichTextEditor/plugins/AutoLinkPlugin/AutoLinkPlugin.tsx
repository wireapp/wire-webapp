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

import {
  AutoLinkPlugin as LexicalAutoLinkPlugin,
  createLinkMatcherWithRegExp,
} from '@lexical/react/LexicalAutoLinkPlugin';

import {URL_REGEX} from '../../utils/url';

const MATCHERS = [
  createLinkMatcherWithRegExp(URL_REGEX, text => {
    return text.startsWith('http') ? text : `https://${text}`;
  }),
];

export const AutoLinkPlugin = (): JSX.Element => {
  return <LexicalAutoLinkPlugin matchers={MATCHERS} />;
};
