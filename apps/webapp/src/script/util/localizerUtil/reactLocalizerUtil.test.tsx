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

import {createReactTranslationMarker, renderReactTranslation, replaceReactComponents} from './reactLocalizerUtil';

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

  it('renders runtime values as text inside and outside translated components', () => {
    const senderNameMarker = createReactTranslationMarker('sender-name');
    const senderName = 'R&D <Test>';
    const translatedText = `<strong>${senderNameMarker.substitution}</strong> started the conversation with ${senderNameMarker.substitution}`;
    const result = renderReactTranslation({
      translatedText,
      componentReplacements: [
        {
          start: '<strong>',
          end: '</strong>',
          render(children) {
            return <strong>{children}</strong>;
          },
        },
      ],
      nodeReplacements: [],
      valueReplacements: [{marker: senderNameMarker, runtimeText: senderName}],
    });

    const {container} = render(<p>{result}</p>);
    const actualText = container.querySelector('p')?.textContent;
    const expectedText = 'R&D <Test> started the conversation with R&D <Test>';

    expect(actualText).toBe(expectedText);
    expect(container.querySelectorAll('strong')).toHaveLength(1);
    expect(container.querySelector('test')).toBeNull();
  });

  it('renders a trusted React node outside translated components', () => {
    const iconMarker = createReactTranslationMarker('permission-icon');
    const result = renderReactTranslation({
      translatedText: `Allow ${iconMarker.substitution} access`,
      componentReplacements: [],
      nodeReplacements: [
        {
          marker: iconMarker,
          render() {
            return <span data-uie-name="permission-icon" />;
          },
        },
      ],
      valueReplacements: [],
    });

    const {getByTestId} = render(<p>{result}</p>);

    expect(getByTestId('permission-icon')).toBeInTheDocument();
  });

  it('renders a trusted React node inside a translated component', () => {
    const lineBreakMarker = createReactTranslationMarker('line-break');
    const result = renderReactTranslation({
      translatedText: `<strong>First${lineBreakMarker.substitution}Second</strong>`,
      componentReplacements: [
        {
          start: '<strong>',
          end: '</strong>',
          render(children) {
            return <strong>{children}</strong>;
          },
        },
      ],
      nodeReplacements: [
        {
          marker: lineBreakMarker,
          render() {
            return <br data-uie-name="line-break" />;
          },
        },
      ],
      valueReplacements: [],
    });

    const {container, getByTestId} = render(<p>{result}</p>);
    const strongElement = container.querySelector('strong');

    expect(getByTestId('line-break')).toBeInTheDocument();
    expect(strongElement).toHaveTextContent('FirstSecond');
  });

  it('renders multiple occurrences of the same trusted React node marker', () => {
    const iconMarker = createReactTranslationMarker('permission-icon');
    const result = renderReactTranslation({
      translatedText: `${iconMarker.substitution} Camera ${iconMarker.substitution} Microphone`,
      componentReplacements: [],
      nodeReplacements: [
        {
          marker: iconMarker,
          render() {
            return <span data-uie-name="permission-icon" />;
          },
        },
      ],
      valueReplacements: [],
    });

    const {getAllByTestId} = render(<p>{result}</p>);

    expect(getAllByTestId('permission-icon')).toHaveLength(2);
  });

  it('renders runtime text and trusted React nodes in translator-controlled order', () => {
    const userNameMarker = createReactTranslationMarker('user-name');
    const iconMarker = createReactTranslationMarker('permission-icon');
    const result = renderReactTranslation({
      translatedText: `${userNameMarker.substitution} ${iconMarker.substitution} was granted`,
      componentReplacements: [],
      nodeReplacements: [
        {
          marker: iconMarker,
          render() {
            return <span data-uie-name="permission-icon" />;
          },
        },
      ],
      valueReplacements: [{marker: userNameMarker, runtimeText: 'R&D <Test>'}],
    });

    const {container, getByTestId} = render(<p>{result}</p>);

    expect(container.querySelector('test')).toBeNull();
    expect(container.querySelector('p')).toHaveTextContent('R&D <Test> was granted');
    expect(getByTestId('permission-icon')).toBeInTheDocument();
  });

  it('keeps translation-looking runtime values literal', () => {
    const senderNameMarker = createReactTranslationMarker('sender-name');
    const senderName = '[bold]Admin[/bold]';
    const result = renderReactTranslation({
      translatedText: `<strong>${senderNameMarker.substitution}</strong> started the conversation`,
      componentReplacements: [
        {
          start: '<strong>',
          end: '</strong>',
          render(children) {
            return <strong>{children}</strong>;
          },
        },
      ],
      nodeReplacements: [],
      valueReplacements: [{marker: senderNameMarker, runtimeText: senderName}],
    });

    const {container} = render(<p>{result}</p>);

    expect(container.querySelector('p')?.textContent).toBe('[bold]Admin[/bold] started the conversation');
    expect(container.querySelectorAll('strong')).toHaveLength(1);
  });

  it('keeps unsupported translation markup as text', () => {
    const result = renderReactTranslation({
      translatedText: '<img src="example"><strong>Started</strong>',
      componentReplacements: [
        {
          start: '<strong>',
          end: '</strong>',
          render(children) {
            return <strong>{children}</strong>;
          },
        },
      ],
      nodeReplacements: [],
      valueReplacements: [],
    });

    const {container} = render(<p>{result}</p>);

    expect(container.querySelector('p')?.textContent).toBe('<img src="example">Started');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('strong')).toHaveTextContent('Started');
  });
});
