/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation: either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 */

import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {BLUR_COMMAND, KEY_ARROW_UP_COMMAND, KEY_ESCAPE_COMMAND, LexicalEditor} from 'lexical';
import {assertNotNull} from '@sindresorhus/is';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {render} from '@testing-library/react';

import {unwrap} from 'Util/test/resultTestSupport';

import {GlobalEventsPlugin} from './globalEventsPlugin';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type GlobalEventsPluginTestFixture = {
  readonly editor: LexicalEditor;
  readonly onShiftTab: jest.Mock<void, []>;
  readonly onEscape: jest.Mock<void, []>;
  readonly onArrowUp: jest.Mock<void, []>;
  readonly onBlur: jest.Mock<void, []>;
};

type ShiftTabCharacterizationTestCase = {
  readonly description: string;
  readonly key: string;
  readonly shiftKey: boolean;
  readonly expectedCallbackCount: number;
};

const shiftTabCharacterizationTestCases: readonly ShiftTabCharacterizationTestCase[] = [
  {
    description: 'Shift+Tab',
    key: 'Tab',
    shiftKey: true,
    expectedCallbackCount: 1,
  },
  {
    description: 'Tab without Shift',
    key: 'Tab',
    shiftKey: false,
    expectedCallbackCount: 0,
  },
  {
    description: 'Shift+Enter',
    key: 'Enter',
    shiftKey: true,
    expectedCallbackCount: 0,
  },
];

function throwEditorError(error: unknown): never {
  throw error;
}

const EditorCapturePlugin: FunctionComponent<EditorCapturePluginProps> = props => {
  const {onReady} = props;
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);

  return null;
};

function renderGlobalEventsPlugin(): Result<GlobalEventsPluginTestFixture, Error> {
  const onShiftTab = jest.fn<void, []>();
  const onEscape = jest.fn<void, []>();
  const onArrowUp = jest.fn<void, []>();
  const onBlur = jest.fn<void, []>();
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{namespace: 'GlobalEventsPluginTest', onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <ContentEditable />
      <GlobalEventsPlugin onShiftTab={onShiftTab} onEscape={onEscape} onArrowUp={onArrowUp} onBlur={onBlur} />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor, onShiftTab, onEscape, onArrowUp, onBlur};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

describe('GlobalEventsPlugin', () => {
  it.each(shiftTabCharacterizationTestCases)('handles only $description on the editor root', testCase => {
    const fixture = unwrap(renderGlobalEventsPlugin());
    const rootElement = fixture.editor.getRootElement();

    assertNotNull(rootElement);

    rootElement.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: testCase.key,
        shiftKey: testCase.shiftKey,
      }),
    );

    expect(fixture.onShiftTab).toHaveBeenCalledTimes(testCase.expectedCallbackCount);
  });

  it('invokes the Escape callback and leaves the command unhandled', () => {
    const fixture = unwrap(renderGlobalEventsPlugin());

    const wasHandled = fixture.editor.dispatchCommand(KEY_ESCAPE_COMMAND, new KeyboardEvent('keydown'));

    expect(wasHandled).toBe(false);
    expect(fixture.onEscape).toHaveBeenCalledTimes(1);
  });

  it('invokes the ArrowUp callback and leaves the command unhandled', () => {
    const fixture = unwrap(renderGlobalEventsPlugin());

    const wasHandled = fixture.editor.dispatchCommand(KEY_ARROW_UP_COMMAND, new KeyboardEvent('keydown'));

    expect(wasHandled).toBe(false);
    expect(fixture.onArrowUp).toHaveBeenCalledTimes(1);
  });

  it('invokes the blur callback and leaves the command unhandled', () => {
    const fixture = unwrap(renderGlobalEventsPlugin());

    const wasHandled = fixture.editor.dispatchCommand(BLUR_COMMAND, new FocusEvent('blur'));

    expect(wasHandled).toBe(false);
    expect(fixture.onBlur).toHaveBeenCalledTimes(1);
  });
});
