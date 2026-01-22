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

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isNodeSelection,
  $isTextNode,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  BLUR_COMMAND,
  NodeKey,
  $isRangeSelection,
  $createRangeSelection,
  BaseSelection,
} from 'lexical';

import {KEY} from 'Util/KeyboardUtil';

import {$isMentionNode} from './MentionNode';

import {getNextSibling, getPreviousSibling} from '../utils/getSelectionInfo';

interface MentionComponentProps {
  mention: string;
  nodeKey: NodeKey;
  className?: string;
  classNameFocused?: string;
}

export const Mention = (props: MentionComponentProps) => {
  const {mention, className = '', classNameFocused = '', nodeKey} = props;
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [selection, setSelection] = useState<BaseSelection | null>(null);
  const isFocused = $isNodeSelection(selection) && isSelected;
  const ref = useRef<HTMLSpanElement>(null);

  const classNameFinal = useMemo(() => {
    const classes = [className];

    if (isFocused) {
      classes.push(classNameFocused);
    }

    return classes.join(' ').trim() || undefined;
  }, [className, classNameFocused, isFocused]);

  const deleteMention = useCallback(
    (event: KeyboardEvent) => {
      const currentSelection = $getSelection();
      const rangeSelection = $isRangeSelection(currentSelection) ? currentSelection : null;

      let shouldSelectNode = false;
      const selectedNode = rangeSelection?.getNodes().length === 1 && rangeSelection?.getNodes()[0];
      if (selectedNode) {
        const isCurrentNode = nodeKey === selectedNode?.getKey();
        if (event.key === KEY.BACKSPACE) {
          // When backspace is hit, we want to select the mention if the cursor is right after it
          const isNextNode =
            selectedNode?.getPreviousSibling()?.getKey() === nodeKey && rangeSelection?.focus.offset === 0;
          shouldSelectNode = isCurrentNode || isNextNode;
        } else if (event.key === KEY.DELETE) {
          // When backspace is hit, we want to select the mention if the cursor is right before it
          const isNextNode =
            selectedNode?.getNextSibling()?.getKey() === nodeKey &&
            rangeSelection?.focus.offset === selectedNode?.getTextContent().length;
          shouldSelectNode = isCurrentNode || isNextNode;
        }
      }
      // If the cursor is right before the mention, we first select the mention before deleting it
      if (shouldSelectNode) {
        event.preventDefault();
        setSelected(true);
        return true;
      }

      // When the mention is selected, we actually delete it
      if (isSelected && $isNodeSelection($getSelection())) {
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);

        if ($isMentionNode(node)) {
          const previousNode = node.getPreviousSibling();
          if ($isTextNode(previousNode)) {
            const newSelection = $createRangeSelection();
            const contentLength = previousNode.getTextContent().length;
            newSelection.setTextNodeRange(previousNode, contentLength, previousNode, contentLength);
            $setSelection(newSelection);
          }
          node.remove();
          return true;
        }
        setSelected(false);
      }
      return false;
    },
    [isSelected, nodeKey, setSelected],
  );

  const moveCursor = useCallback(
    (event: KeyboardEvent) => {
      const node = $getNodeByKey(nodeKey);
      if (!node || !node.isSelected()) {
        return false;
      }

      const isLeftDirection = event.key === KEY.ARROW_LEFT;

      let handled = false;
      const nodeToSelect = isLeftDirection ? getPreviousSibling(node) : getNextSibling(node);

      // Checking if is a element node, list of specified Element Nodes You can find here:
      // https://lexical.dev/docs/api/classes/lexical.ElementNode
      if ($isElementNode(nodeToSelect)) {
        if (isLeftDirection) {
          nodeToSelect.selectEnd();
        } else {
          nodeToSelect.selectStart();
        }

        handled = true;
      }

      // Handling node
      if ($isTextNode(nodeToSelect)) {
        if (isLeftDirection) {
          nodeToSelect.select();
        } else {
          nodeToSelect.select(0, 0);
        }

        handled = true;
      }

      if ($isDecoratorNode(nodeToSelect)) {
        if (isLeftDirection) {
          nodeToSelect.selectNext();
        } else {
          nodeToSelect.selectPrevious();
        }

        handled = true;
      }

      if (nodeToSelect === null) {
        if (isLeftDirection) {
          node.selectPrevious();
        } else {
          node.selectNext();
        }

        handled = true;
      }

      if (handled) {
        event.preventDefault();
      }

      return handled;
    },
    [nodeKey],
  );

  const selectMention = useCallback(
    (event: MouseEvent) => {
      if (event.target === ref.current) {
        if (!event.shiftKey) {
          clearSelection();
        }
        setSelected(!isSelected);
        return true;
      }
      return false;
    },
    [isSelected, clearSelection, setSelected],
  );

  const unselectMention = useCallback(() => {
    if (isFocused) {
      $setSelection(null);
      return true;
    }
    return false;
  }, [isFocused]);

  useEffect(() => {
    let isMounted = true;
    const unregister = mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        if (isMounted) {
          setSelection(editorState.read(() => $getSelection()));
        }
      }),

      editor.registerCommand<MouseEvent>(CLICK_COMMAND, selectMention, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_DELETE_COMMAND, deleteMention, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, deleteMention, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ARROW_LEFT_COMMAND, moveCursor, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, moveCursor, COMMAND_PRIORITY_LOW),
      editor.registerCommand(BLUR_COMMAND, unselectMention, COMMAND_PRIORITY_LOW),
    );

    return () => {
      isMounted = false;
      unregister();
    };
  }, [editor, moveCursor, selectMention, unselectMention, deleteMention]);

  return (
    <span ref={ref} className={classNameFinal} data-mention={mention} data-uie-name="item-input-mention">
      {mention}
    </span>
  );
};
