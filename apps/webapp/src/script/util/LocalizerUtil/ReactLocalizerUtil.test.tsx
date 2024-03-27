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

import {replaceReactComponents} from './ReactLocalizerUtil';

describe('replaceReactComponents', () => {
  it('return the string untouched if no replacements are given', () => {
    const result = replaceReactComponents('Hello World', []);
    expect(result).toEqual(['Hello World']);
  });

  it('replaces a single pattern with a react component', () => {
    const result = replaceReactComponents('Hello World <strong>test</strong>', [
      {
        start: '<strong>',
        end: '</strong>',
        render: text => <strong>{text}</strong>,
      },
    ]);

    expect(result).toHaveLength(2);
  });

  it('replaces a multiple patterns with a react component', () => {
    const result = replaceReactComponents('Hello World <strong>test</strong> <strong>another test</strong>', [
      {
        start: '<strong>',
        end: '</strong>',
        render: text => <strong>{text}</strong>,
      },
    ]);

    expect(result).toHaveLength(4);
  });

  it('replaces a multiple patterns with multiple react component', () => {
    const result = replaceReactComponents('Hello World <strong>test</strong> [link]another test[/link]', [
      {
        start: '<strong>',
        end: '</strong>',
        render: text => <strong>{text}</strong>,
      },
      {
        start: '[link]',
        end: '[/link]',
        render: text => <button>{text}</button>,
      },
    ]);

    expect(result).toHaveLength(4);
  });
});
