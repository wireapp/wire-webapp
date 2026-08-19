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

import {$convertToMarkdownString} from '@lexical/markdown';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getRoot, LexicalEditor} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {render, waitFor} from '@testing-library/react';

import {DraftState} from 'Components/InputBar/common/draftState/draftState';
import {unwrap} from 'Util/test/resultTestSupport';

import {editorConfig} from '../../editorConfig';
import {markdownTransformers} from '../../utils/markdownTransformers';
import {createWireLexicalEditorTestHarness} from '../../testSupport/createWireLexicalEditorTestHarness';
import {DraftStatePlugin} from './DraftStatePlugin';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type DraftStateCharacterizationTestCase = {
  readonly description: string;
  readonly inputMarkdown: string;
  readonly expectedMarkdown: string;
  readonly expectedTextContent: string;
};

type DraftStatePluginTestFixture = {
  readonly editor: LexicalEditor;
  readonly loadDraftState: jest.Mock<Promise<DraftState>, []>;
};

const draftStateCharacterizationTestCases: readonly DraftStateCharacterizationTestCase[] = [
  {
    description: 'a plain paragraph',
    inputMarkdown: 'draft message',
    expectedMarkdown: 'draft message',
    expectedTextContent: 'draft message',
  },
  {
    description: 'formatted and multiline content',
    inputMarkdown: '**draft**\n\nsecond line',
    expectedMarkdown: '**draft**\n\nsecond line',
    expectedTextContent: 'draft\n\n\n\nsecond line',
  },
  {
    description: 'a list and a link',
    inputMarkdown: '- first\n- [second](https://wire.com)',
    expectedMarkdown: '- first\n- [second](https://wire.com)',
    expectedTextContent: 'first\n\nsecond',
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

function createSerializedEditorState(inputMarkdown: string): string {
  const sourceHarness = createWireLexicalEditorTestHarness();
  sourceHarness.importMarkdown(inputMarkdown);

  return JSON.stringify(sourceHarness.editor.getEditorState().toJSON());
}

function renderDraftStatePlugin(draftState: DraftState): Result<DraftStatePluginTestFixture, Error> {
  const loadDraftState = jest.fn<Promise<DraftState>, []>().mockResolvedValue(draftState);
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <DraftStatePlugin loadDraftState={loadDraftState} />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor, loadDraftState};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

function getMarkdown(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    return $convertToMarkdownString(markdownTransformers, undefined, true);
  });
}

function getTextContent(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    return $getRoot().getTextContent();
  });
}

describe('DraftStatePlugin', () => {
  it.each(draftStateCharacterizationTestCases)('restores $description from serialized editor state', async testCase => {
    const serializedEditorState = createSerializedEditorState(testCase.inputMarkdown);
    const fixture = unwrap(renderDraftStatePlugin({editorState: serializedEditorState}));

    await waitFor(() => {
      expect(fixture.loadDraftState).toHaveBeenCalledTimes(1);
      expect(getMarkdown(fixture.editor)).toBe(testCase.expectedMarkdown);
    });

    expect(getTextContent(fixture.editor)).toBe(testCase.expectedTextContent);
  });

  it.each([
    {description: 'a null editor state', editorState: null},
    {description: 'an empty editor state', editorState: ''},
  ])('keeps the editor empty for $description', async draftStateTestCase => {
    const fixture = unwrap(renderDraftStatePlugin(draftStateTestCase));

    await waitFor(() => {
      expect(fixture.loadDraftState).toHaveBeenCalledTimes(1);
    });

    expect(getMarkdown(fixture.editor)).toBe('');
    expect(getTextContent(fixture.editor)).toBe('');
  });
});
