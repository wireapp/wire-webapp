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

import {useEffect} from 'react';

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createParagraphNode, $getRoot, LexicalEditor, PASTE_COMMAND} from 'lexical';

import {render} from '@testing-library/react';

import {PlainTextPastePlugin} from './PlainTextPastePlugin';

const EditorCapturePlugin = ({onReady}: {onReady: (editor: LexicalEditor) => void}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => onReady(editor), [editor, onReady]);

  return null;
};

const renderPlugin = () => {
  const onError = jest.fn();
  const onReady = jest.fn<void, [LexicalEditor]>();

  render(
    <LexicalComposer initialConfig={{namespace: 'PlainTextPastePluginTest', onError}}>
      <EditorCapturePlugin onReady={onReady} />
      <PlainTextPastePlugin />
    </LexicalComposer>,
  );

  expect(onReady).toHaveBeenCalledTimes(1);

  return {editor: onReady.mock.calls[0][0], onError};
};

const createPasteEvent = (plainText: string) => {
  const preventDefault = jest.fn();
  const event = {
    clipboardData: {getData: () => plainText},
    preventDefault,
  } as unknown as ClipboardEvent;

  return {event, preventDefault};
};

describe('PlainTextPastePlugin', () => {
  it('does not consume a paste event without a range selection', () => {
    const {editor, onError} = renderPlugin();
    const {event, preventDefault} = createPasteEvent('plain text');

    expect(editor.dispatchCommand(PASTE_COMMAND, event)).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('consumes a paste event after inserting text into a range selection', () => {
    const {editor, onError} = renderPlugin();
    const {event, preventDefault} = createPasteEvent('plain text');
    let wasHandled = false;

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        const root = $getRoot();
        root.clear();
        root.append(paragraph);
        paragraph.selectEnd();
        wasHandled = editor.dispatchCommand(PASTE_COMMAND, event);
      },
      {discrete: true},
    );

    expect(wasHandled).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('plain text');
    expect(onError).not.toHaveBeenCalled();
  });
});
