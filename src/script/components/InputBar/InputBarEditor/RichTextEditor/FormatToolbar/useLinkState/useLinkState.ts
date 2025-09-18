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

import {useCallback, useEffect} from 'react';

import {$createLinkNode, $isLinkNode, LinkNode} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$findMatchingParent} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  CLICK_COMMAND,
  TextNode,
  RangeSelection,
  createCommand,
} from 'lexical';

import {createNewLink} from './createNewLink/createNewLink';
import {getSelectedNode} from './getSelectedNode/getSelectedNode';
import {useLinkEditing} from './useLinkEditing/useLinkEditing';
import {useModalState} from './useModalState/useModalState';

import {sanitizeUrl} from '../../utils/url';

export const FORMAT_LINK_COMMAND = createCommand<void>();

interface SelectionPoint {
  key: string;
  offset: number;
}

interface SavedSelection {
  anchor: SelectionPoint;
  focus: SelectionPoint;
}

export const useLinkState = () => {
  const [editor] = useLexicalComposerContext();
  const {isOpen, open, close} = useModalState();
  const {editingLink, setEditingLink, resetLinkState} = useLinkEditing();

  const formatLink = useCallback(() => {
    if (!editor.isEditable()) {
      return;
    }

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return;
      }

      const node = getSelectedNode(selection);
      const existingLink = $findMatchingParent(node, $isLinkNode);

      if (!existingLink) {
        setEditingLink({
          text: selection.getTextContent(),
          url: '',
          node: null,
          selection: {
            anchor: {key: selection.anchor.key, offset: selection.anchor.offset},
            focus: {key: selection.focus.key, offset: selection.focus.offset},
          },
        });
        open();
        return;
      }

      setEditingLink({
        node: existingLink,
        url: existingLink.getURL(),
        text: existingLink.getTextContent(),
        selection: null,
      });
      open();
    });
  }, [editor, setEditingLink, open]);

  const restoreSelection = useCallback((selection: RangeSelection, savedSelection: SavedSelection) => {
    selection.anchor.key = savedSelection.anchor.key;
    selection.anchor.offset = savedSelection.anchor.offset;
    selection.focus.key = savedSelection.focus.key;
    selection.focus.offset = savedSelection.focus.offset;
    selection.dirty = true;
  }, []);

  const insertLink = useCallback(
    (url: string, text?: string) => {
      if (!editor.isEditable()) {
        return;
      }

      editor.update(() => {
        const sanitizedUrl = sanitizeUrl(url);

        if (editingLink.node && $isLinkNode(editingLink.node)) {
          if (!editingLink.node.isAttached()) {
            // Node no longer exists in the editor
            return;
          }

          const newLinkNode = $createLinkNode(sanitizedUrl);
          const newTextNode = $createTextNode(text || editingLink.node.getTextContent());
          newLinkNode.append(newTextNode);
          editingLink.node.replace(newLinkNode);

          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.setTextNodeRange(newTextNode, 0, newTextNode, newTextNode.getTextContent().length);
          }

          resetLinkState(close);
          return;
        }

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        if (editingLink.selection) {
          restoreSelection(selection, editingLink.selection);
        }

        createNewLink({
          selection,
          url: sanitizedUrl,
          text,
        });
        resetLinkState(close);
      });
    },
    [editor, editingLink.node, editingLink.selection, resetLinkState, restoreSelection, close],
  );

  const handleLinkClick = useCallback(
    (linkNode: LinkNode) => {
      editor.update(() => {
        if (!$isLinkNode(linkNode)) {
          return;
        }

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        const textNode = linkNode.getFirstChild() as TextNode;
        selection.setTextNodeRange(textNode, 0, textNode, linkNode.getTextContent().length);

        setEditingLink({
          node: linkNode,
          url: linkNode.getURL(),
          text: linkNode.getTextContent(),
          selection: null,
        });
        open();
      });
    },
    [editor, setEditingLink, open],
  );

  const handleClickCommand = useCallback(
    (event: MouseEvent) => {
      const linkDomNode = (event.target as HTMLElement).closest('a');
      if (!linkDomNode) {
        return false;
      }

      event.preventDefault();

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        const node = getSelectedNode(selection);
        const linkNode = $findMatchingParent(node, $isLinkNode);
        if (linkNode) {
          handleLinkClick(linkNode);
        }
      });

      return false;
    },
    [editor, handleLinkClick],
  );

  useEffect(() => {
    return editor.registerCommand(
      FORMAT_LINK_COMMAND,
      () => {
        formatLink();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, formatLink]);

  useEffect(() => {
    return editor.registerCommand(CLICK_COMMAND, handleClickCommand, COMMAND_PRIORITY_LOW);
  }, [editor, handleClickCommand]);

  return {
    formatLink,
    insertLink,
    isModalOpen: isOpen,
    closeModal: close,
    selectedText: editingLink.text,
    linkUrl: editingLink.url,
    linkNode: editingLink.node,
  };
};
