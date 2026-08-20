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
import {$convertToMarkdownString} from '@lexical/markdown';
import {$createQuoteNode} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createTextNode,
  $getRoot,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  LexicalEditor,
} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {act, render} from '@testing-library/react';

import {Config} from 'src/script/Config';
import {unwrap} from 'Util/test/resultTestSupport';

import {editorConfig} from '../../editorConfig';
import {SendPlugin} from '../SendPlugin/SendPlugin';
import {markdownTransformers} from '../../utils/markdownTransformers';
import {BlockquotePlugin} from './BlockquotePlugin';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type BlockquotePluginTestFixture = {
  readonly editor: LexicalEditor;
  readonly onSend: jest.Mock<void, []>;
};

type BlockquotePluginTestFunction = () => void;

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

function withDefaultFeatureConfiguration(testFunction: BlockquotePluginTestFunction): BlockquotePluginTestFunction {
  return () => {
    try {
      testFunction();
    } finally {
      Config._dangerouslySetConfigFeaturesForDebug(defaultFeatureConfiguration);
    }
  };
}

function renderBlockquotePlugin(includeRichTextPlugin: boolean): Result<BlockquotePluginTestFixture, Error> {
  const onSend = jest.fn<void, []>();
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      {includeRichTextPlugin && (
        <RichTextPlugin contentEditable={<ContentEditable />} ErrorBoundary={throwEditorError} />
      )}
      <BlockquotePlugin />
      <SendPlugin onSend={onSend} />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor, onSend};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

function prepareQuote(editor: LexicalEditor, includeTrailingLineBreak: boolean): void {
  editor.update(
    () => {
      const quote = $createQuoteNode();
      quote.append($createTextNode('quoted'));

      if (includeTrailingLineBreak) {
        quote.append($createLineBreakNode());
      }

      $getRoot().clear();
      $getRoot().append(quote);
      quote.selectEnd();
    },
    {discrete: true},
  );
}

function getMarkdown(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    return $convertToMarkdownString(markdownTransformers, undefined, true);
  });
}

describe('BlockquotePlugin', () => {
  it(
    'leaves a null Enter event unhandled',
    withDefaultFeatureConfiguration(() => {
      const fixture = unwrap(renderBlockquotePlugin(false));

      const wasHandled = fixture.editor.dispatchCommand(KEY_ENTER_COMMAND, null);

      expect(wasHandled).toBe(false);
      expect(fixture.onSend).not.toHaveBeenCalled();
    }),
  );

  it(
    'inserts a line break inside a quote for Shift+Enter',
    withDefaultFeatureConfiguration(() => {
      setMessageFormatButtonsEnabled(true);
      const fixture = unwrap(renderBlockquotePlugin(true));
      act(() => {
        prepareQuote(fixture.editor, false);
      });
      const shiftEnterEvent = new KeyboardEvent('keydown', {cancelable: true, shiftKey: true});

      let wasHandled = false;
      act(() => {
        wasHandled = fixture.editor.dispatchCommand(KEY_ENTER_COMMAND, shiftEnterEvent);
      });

      expect(wasHandled).toBe(true);
      expect(shiftEnterEvent.defaultPrevented).toBe(true);
      expect(getMarkdown(fixture.editor)).toBe('> quoted');
      expect(fixture.onSend).not.toHaveBeenCalled();
    }),
  );

  it(
    'keeps the quote and adds an empty quoted line when Backspace follows a trailing line break',
    withDefaultFeatureConfiguration(() => {
      const fixture = unwrap(renderBlockquotePlugin(true));
      act(() => {
        prepareQuote(fixture.editor, true);
      });
      const backspaceEvent = new KeyboardEvent('keydown', {cancelable: true, key: 'Backspace'});

      let wasHandled = false;
      act(() => {
        wasHandled = fixture.editor.dispatchCommand(KEY_BACKSPACE_COMMAND, backspaceEvent);
      });

      expect(wasHandled).toBe(true);
      expect(backspaceEvent.defaultPrevented).toBe(true);
      expect(getMarkdown(fixture.editor)).toBe('> quoted\n> ');
    }),
  );

  it(
    'prevents Backspace but leaves a quote unchanged without a trailing line break',
    withDefaultFeatureConfiguration(() => {
      const fixture = unwrap(renderBlockquotePlugin(false));
      act(() => {
        prepareQuote(fixture.editor, false);
      });
      const backspaceEvent = new KeyboardEvent('keydown', {cancelable: true, key: 'Backspace'});

      let wasHandled = false;
      act(() => {
        wasHandled = fixture.editor.dispatchCommand(KEY_BACKSPACE_COMMAND, backspaceEvent);
      });

      expect(wasHandled).toBe(false);
      expect(backspaceEvent.defaultPrevented).toBe(true);
      expect(getMarkdown(fixture.editor)).toBe('> quoted');
    }),
  );
});
