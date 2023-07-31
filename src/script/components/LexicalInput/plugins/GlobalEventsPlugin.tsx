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
import {LexicalCommand, createCommand, COMMAND_PRIORITY_HIGH} from 'lexical';

import {isTabKey} from 'Util/KeyboardUtil';

export const ON_SHIFT_TAB: LexicalCommand<KeyboardEvent> = createCommand('ON_SHIFT_TAB');

interface GlobalEventsPluginProps {
  onShiftTab: () => void;
}

export function GlobalEventsPlugin({onShiftTab}: GlobalEventsPluginProps): null {
  const [editor] = useLexicalComposerContext();

  const onKeyDown = (event: KeyboardEvent) => {
    // "Shift" + "Tab"
    if (event.shiftKey && isTabKey(event)) {
      editor.dispatchCommand(ON_SHIFT_TAB, event);
    }
  };

  useLayoutEffect(() => {
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
    );

    return () => {
      unregister();
    };
  }, [editor, onShiftTab]);

  return null;
}

// Example of usage global commands, You can use it everywhere in LexicalComposer
// editor.registerCommand(
//   ON_SHIFT_TAB,
//   (event) => {
//     // Do something with `event`, e.g. `event.preventDefault() && onShiftTab()`
//   },
//   COMMAND_PRIORITY_HIGH,
// )
