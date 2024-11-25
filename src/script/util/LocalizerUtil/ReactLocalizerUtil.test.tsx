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

import {render} from '@testing-library/react';

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

  it('replaces literal strings with a component', () => {
    const username = 'Patryk';
    const result = replaceReactComponents('Hello {username}!', [
      {
        exactMatch: '{username}',
        render: () => <strong>{username}</strong>,
      },
    ]);
    const {getByText} = render(<div>{result}</div>);

    expect(getByText(username)).toBeTruthy();
  });

  it('replaces literal strings with a string', () => {
    const username = 'Przemek';
    const result = replaceReactComponents('Hello {username}!', [
      {
        exactMatch: '{username}',
        render: () => username,
      },
    ]);

    const {getByTestId} = render(<p data-uie-name="parent">{result}</p>);

    expect(result).toHaveLength(3);
    expect(getByTestId('parent').textContent).toEqual('Hello Przemek!');
  });

  it('replaces multiple literal strings', () => {
    const username1 = 'John';
    const username2 = 'Jerry';
    const result = replaceReactComponents(`Hello {username1} and {username2}, my name is also {username1}!`, [
      {
        exactMatch: '{username1}',
        render: () => <u>{username1}</u>,
      },
      {
        exactMatch: '{username2}',
        render: () => <u>{username2}</u>,
      },
    ]);

    const {getByTestId} = render(<p data-uie-name="parent">{result}</p>);

    expect(result).toHaveLength(7);
    expect(getByTestId('parent').textContent).toEqual('Hello John and Jerry, my name is also John!');
  });

  it('replaces components and literal strings at the same time', () => {
    const username1 = 'Tom';
    const username2 = 'Tim';
    const result = replaceReactComponents(`Hello [bold]${username1}[/bold] and {username2}!`, [
      {
        start: '[bold]',
        end: '[/bold]',
        render: text => <strong>{text}</strong>,
      },
      {
        exactMatch: '{username2}',
        render: () => <u>{username2}</u>,
      },
    ]);

    const {getByTestId} = render(<p data-uie-name="parent">{result}</p>);

    expect(result).toHaveLength(5);
    expect(getByTestId('parent').textContent).toEqual('Hello Tom and Tim!');
  });

  it('replaces literal string inside of a component', () => {
    const username = 'Jake';
    const username2 = 'Marco';
    const result = replaceReactComponents(`Hello [bold]{username}[/bold], [bold]Paul[/bold] and {username2}!`, [
      {
        start: '[bold]',
        end: '[/bold]',
        render: text => <strong>{text}</strong>,
      },
      {
        exactMatch: '{username}',
        render: () => <u>{username}</u>,
      },
      {
        exactMatch: '{username2}',
        render: () => <u>{username2}</u>,
      },
    ]);

    const {getByTestId} = render(<p data-uie-name="parent">{result}</p>);

    expect(result).toHaveLength(7);
    expect(getByTestId('parent').textContent).toEqual('Hello Jake, Paul and Marco!');
  });
});
