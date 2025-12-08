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

import {useEffect, useLayoutEffect} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
  LexicalCommand,
  createCommand,
  COMMAND_PRIORITY_HIGH,
  KEY_ESCAPE_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_UP_COMMAND,
  BLUR_COMMAND,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';

import {isTabKey} from 'Util/KeyboardUtil';

const ON_SHIFT_TAB: LexicalCommand<KeyboardEvent> = createCommand('ON_SHIFT_TAB');
interface GlobalEventsPluginProps {
  onShiftTab: () => void;
  onEscape: () => void;
  onArrowUp: () => void;
  onBlur: () => void;
}

export function GlobalEventsPlugin({onShiftTab, onArrowUp, onEscape, onBlur}: GlobalEventsPluginProps): null {
  const [editor] = useLexicalComposerContext();

  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // "Shift" + "Tab"
      if (event.shiftKey && isTabKey(event)) {
        editor.dispatchCommand(ON_SHIFT_TAB, event);
      }
    };
    const unregister = editor.registerRootListener(
      (rootElement: HTMLElement | null, prevRootElement: HTMLElement | null) => {
        if (prevRootElement !== null) {
          prevRootElement.removeEventListener('keydown', onKeyDown);
        }
        if (rootElement !== null) {
          rootElement.addEventListener('keydown', onKeyDown);
        }
      },
    );

    return () => {
      unregister();
    };
  }, [editor]);

  useEffect(() => {
    const unregister = mergeRegister(
      editor.registerCommand(
        ON_SHIFT_TAB,
        () => {
          onShiftTab();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          onEscape();
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        () => {
          onArrowUp();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        event => {
          onBlur();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
    return unregister;
  }, [editor, onArrowUp, onEscape, onShiftTab]);

  return null;
}
