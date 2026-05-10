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

import {useCallback, useEffect, useRef} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import {FireAndForgetInvoker} from '@wireapp/core';

import {DraftState} from 'Components/InputBar/common/draftState/draftState';

interface DraftStatePluginProps {
  loadDraftState: () => Promise<any>;
  fireAndForgetInvoker: FireAndForgetInvoker;
}

export function DraftStatePlugin({loadDraftState, fireAndForgetInvoker}: DraftStatePluginProps): null {
  const [editor] = useLexicalComposerContext();
  const hasLoadedDraftState = useRef(false);

  const getDraftState = useCallback(async () => {
    const draftState: DraftState = await loadDraftState();

    if (draftState.editorState != null && draftState.editorState !== '') {
      const initialEditorState = editor.parseEditorState(draftState.editorState);

      if (!initialEditorState.isEmpty()) {
        editor.setEditorState(initialEditorState);
      }
    }
  }, [editor, loadDraftState]);

  useEffect(() => {
    if (hasLoadedDraftState.current) {
      return;
    }

    hasLoadedDraftState.current = true;
    fireAndForgetInvoker.fireAndForget(async () => {
      await getDraftState();
    });
  }, [fireAndForgetInvoker, getDraftState]);

  return null;
}
