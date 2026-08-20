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
 */

import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createParagraphNode, $createTextNode, $getRoot, KEY_ENTER_COMMAND, LexicalEditor} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {act, render} from '@testing-library/react';

import {Config} from 'src/script/Config';
import {unwrap} from 'Util/test/resultTestSupport';

import {editorConfig} from '../../editorConfig';
import {SendPlugin} from './SendPlugin';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type SendPluginTestFixture = {
  readonly editor: LexicalEditor;
  readonly onSend: jest.Mock<void, []>;
};

type SendPluginTestFunction = () => void;

const defaultFeatureConfiguration = Config.getConfig().FEATURE;

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

function setMessageFormatButtonsEnabled(enabled: boolean): void {
  Config._dangerouslySetConfigFeaturesForDebug({
    ...Config.getConfig().FEATURE,
    ENABLE_MESSAGE_FORMAT_BUTTONS: enabled,
  });
}

function selectTextAtEndOfParagraph(editor: LexicalEditor): void {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode('message'));
      $getRoot().append(paragraph);
      paragraph.selectEnd();
    },
    {discrete: true},
  );
}

function getRootChildCount(editor: LexicalEditor): number {
  return editor.getEditorState().read(() => {
    return $getRoot().getChildrenSize();
  });
}

function withDefaultFeatureConfiguration(testFunction: SendPluginTestFunction): SendPluginTestFunction {
  return () => {
    try {
      testFunction();
    } finally {
      Config._dangerouslySetConfigFeaturesForDebug(defaultFeatureConfiguration);
    }
  };
}

function renderSendPlugin(): Result<SendPluginTestFixture, Error> {
  const onSend = jest.fn<void, []>();
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <RichTextPlugin contentEditable={<ContentEditable />} ErrorBoundary={throwEditorError} />
      <SendPlugin onSend={onSend} />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor, onSend};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

describe('SendPlugin', () => {
  it(
    'leaves a null Enter event unhandled',
    withDefaultFeatureConfiguration(() => {
      const fixture = unwrap(renderSendPlugin());

      const wasHandled = fixture.editor.dispatchCommand(KEY_ENTER_COMMAND, null);

      expect(wasHandled).toBe(false);
      expect(fixture.onSend).not.toHaveBeenCalled();
    }),
  );

  it(
    'sends on plain Enter and prevents the browser default',
    withDefaultFeatureConfiguration(() => {
      const fixture = unwrap(renderSendPlugin());
      const enterEvent = new KeyboardEvent('keydown', {cancelable: true});

      const wasHandled = fixture.editor.dispatchCommand(KEY_ENTER_COMMAND, enterEvent);

      expect(wasHandled).toBe(true);
      expect(enterEvent.defaultPrevented).toBe(true);
      expect(fixture.onSend).toHaveBeenCalledTimes(1);
    }),
  );

  it(
    'handles Shift+Enter without preventing the browser default when formatting buttons are disabled',
    withDefaultFeatureConfiguration(() => {
      setMessageFormatButtonsEnabled(false);
      const fixture = unwrap(renderSendPlugin());
      const shiftEnterEvent = new KeyboardEvent('keydown', {cancelable: true, shiftKey: true});

      const wasHandled = fixture.editor.dispatchCommand(KEY_ENTER_COMMAND, shiftEnterEvent);

      expect(wasHandled).toBe(true);
      expect(shiftEnterEvent.defaultPrevented).toBe(false);
      expect(fixture.onSend).not.toHaveBeenCalled();
    }),
  );

  it(
    'delegates Shift+Enter to paragraph insertion when formatting buttons are enabled',
    withDefaultFeatureConfiguration(() => {
      setMessageFormatButtonsEnabled(true);
      const fixture = unwrap(renderSendPlugin());
      act(() => {
        selectTextAtEndOfParagraph(fixture.editor);
      });
      const shiftEnterEvent = new KeyboardEvent('keydown', {cancelable: true, shiftKey: true});

      const wasHandled = fixture.editor.dispatchCommand(KEY_ENTER_COMMAND, shiftEnterEvent);

      expect(wasHandled).toBe(true);
      expect(shiftEnterEvent.defaultPrevented).toBe(true);
      expect(fixture.onSend).not.toHaveBeenCalled();
      expect(getRootChildCount(fixture.editor)).toBe(2);
    }),
  );
});
