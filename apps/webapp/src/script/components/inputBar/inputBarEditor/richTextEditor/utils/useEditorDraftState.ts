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

import {useEffect, RefObject, useCallback} from 'react';

import {$convertToMarkdownString} from '@lexical/markdown';
import {LexicalEditor} from 'lexical';
import {useDebouncedCallback} from 'use-debounce';

import {markdownTransformers} from './markdownTransformers';
import {transformMessage} from './transformMessage';

const DRAFT_SAVE_DELAY = 800;

interface UseEditorDraftStateProps {
  editorRef: RefObject<LexicalEditor | null>;
  saveDraftState: (editorState: string, plainMessage: string, replyId?: string) => void;
  replaceEmojis: boolean;
}

export const useEditorDraftState = ({editorRef, saveDraftState, replaceEmojis}: UseEditorDraftStateProps) => {
  const saveDraft = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.getEditorState().read(() => {
      const markdown = $convertToMarkdownString(markdownTransformers, undefined, true);
      saveDraftState(
        JSON.stringify(editor.getEditorState().toJSON()),
        transformMessage({replaceEmojis, markdown}),
        undefined,
      );
    });
  }, [editorRef, saveDraftState, replaceEmojis]);

  const debouncedSaveDraftState = useDebouncedCallback(saveDraft, DRAFT_SAVE_DELAY);

  useEffect(() => {
    return () => {
      debouncedSaveDraftState.flush();
    };
  }, [debouncedSaveDraftState, saveDraft]);

  return {
    saveDraft: debouncedSaveDraftState,
  };
};
