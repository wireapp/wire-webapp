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

/**
 * This is a modified version of https://github.com/facebook/lexical/blob/main/packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx
 * It allows showing a list that is filled from the bottom up instead of the top down (the default selected item is at the bottom of the list).
 * The only differences lie in:
 * - the default index we select when the component is instanciated (the last one by default)
 * - a protection to avoid re-rendering the entire component when the list updates (which makes the scroll flicker)
 */
import React, {
  MutableRefObject,
  ReactPortal,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  LexicalEditor,
  RangeSelection,
  TextNode,
} from 'lexical';

export type QueryMatch = {
  leadOffset: number;
  matchingString: string;
  replaceableString: string;
};

export type Resolution = {
  match: QueryMatch;
  getRect: () => DOMRect;
};

export class TypeaheadOption {
  key: string;
  ref?: MutableRefObject<HTMLElement | null>;

  constructor(key: string) {
    this.key = key;
    this.ref = {current: null};
    this.setRefElement = this.setRefElement.bind(this);
  }

  setRefElement(element: HTMLElement | null) {
    this.ref = {current: element};
  }
}

export type ItemProps<TOption extends TypeaheadOption> = {
  selectedIndex: number | null;
  selectOptionAndCleanUp: (option: TOption) => void;
  setHighlightedIndex: (index: number) => void;
  options: Array<TOption>;
};

export type MenuRenderFn<TOption extends TypeaheadOption> = (
  anchorElementRef: MutableRefObject<HTMLElement | null>,
  itemProps: ItemProps<TOption>,
  matchingString: string,
) => ReactPortal | JSX.Element | null;

const scrollToOption = <TOption extends TypeaheadOption>(index: number, options: TOption[]) => {
  const selectedOption = options[index];
  const element = selectedOption && selectedOption.ref?.current;
  element?.scrollIntoView({block: 'nearest'});
};

function getTextUpToAnchor(selection: RangeSelection): string | null {
  const anchor = selection.anchor;
  if (anchor.type !== 'text') {
    return null;
  }
  const anchorNode = anchor.getNode();
  if (!anchorNode.isSimpleText()) {
    return null;
  }
  const anchorOffset = anchor.offset;
  return anchorNode.getTextContent().slice(0, anchorOffset);
}

function tryToPositionRange(leadOffset: number, range: Range): boolean {
  const domSelection = window.getSelection();
  if (domSelection === null || !domSelection.isCollapsed) {
    return false;
  }
  const anchorNode = domSelection.anchorNode;
  const startOffset = leadOffset;
  const endOffset = domSelection.anchorOffset;

  if (anchorNode == null || endOffset == null) {
    return false;
  }

  try {
    range.setStart(anchorNode, startOffset);
    range.setEnd(anchorNode, endOffset);
  } catch (error) {
    return false;
  }

  return true;
}

function getQueryTextForSearch(editor: LexicalEditor): string | null {
  let text = null;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }
    text = getTextUpToAnchor(selection);
  });
  return text;
}

/**
 * Walk backwards along user input and forward through entity title to try
 * and replace more of the user's text with entity.
 */
function getFullMatchOffset(documentText: string, entryText: string, offset: number): number {
  let triggerOffset = offset;
  for (let i = triggerOffset; i <= entryText.length; i++) {
    if (documentText.substr(-i) === entryText.substr(0, i)) {
      triggerOffset = i;
    }
  }
  return triggerOffset;
}

/**
 * Split Lexical TextNode and return a new TextNode only containing matched text.
 * Common use cases include: removing the node, replacing with a new node.
 */
function splitNodeContainingQuery(editor: LexicalEditor, match: QueryMatch): TextNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }
  const anchor = selection.anchor;
  if (anchor.type !== 'text') {
    return null;
  }
  const anchorNode = anchor.getNode();
  if (!anchorNode.isSimpleText()) {
    return null;
  }
  const selectionOffset = anchor.offset;
  const textContent = anchorNode.getTextContent().slice(0, selectionOffset);
  const characterOffset = match.replaceableString.length;
  const queryOffset = getFullMatchOffset(textContent, match.matchingString, characterOffset);
  const startOffset = selectionOffset - queryOffset;
  if (startOffset < 0) {
    return null;
  }
  let newNode;
  if (startOffset === 0) {
    [newNode] = anchorNode.splitText(selectionOffset);
  } else {
    [, newNode] = anchorNode.splitText(startOffset, selectionOffset);
  }

  return newNode;
}

function isSelectionOnEntityBoundary(editor: LexicalEditor, offset: number): boolean {
  if (offset !== 0) {
    return false;
  }
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();
      const prevSibling = anchorNode.getPreviousSibling();
      return $isTextNode(prevSibling) && prevSibling.isTextEntity();
    }
    return false;
  });
}

function startTransition(callback: () => void) {
  if (React.startTransition) {
    React.startTransition(callback);
  } else {
    callback();
  }
}

// Got from https://stackoverflow.com/a/42543908/2013580
export function getScrollParent(element: HTMLElement, includeHidden: boolean): HTMLElement | HTMLBodyElement {
  let style = getComputedStyle(element);
  const excludeStaticParent = style.position === 'absolute';
  const overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;
  if (style.position === 'fixed') {
    return document.body;
  }
  for (let parent: HTMLElement | null = element; (parent = parent.parentElement); ) {
    style = getComputedStyle(parent);
    if (excludeStaticParent && style.position === 'static') {
      continue;
    }
    if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) {
      return parent;
    }
  }
  return document.body;
}

function isTriggerVisibleInNearestScrollContainer(targetElement: HTMLElement, containerElement: HTMLElement): boolean {
  const tRect = targetElement.getBoundingClientRect();
  const cRect = containerElement.getBoundingClientRect();
  return tRect.top > cRect.top && tRect.top < cRect.bottom;
}

// Reposition the menu on scroll, window resize, and element resize.
function useDynamicPositioning(
  resolution: Resolution | null,
  targetElement: HTMLElement | null,
  onReposition: () => void,
  onVisibilityChange?: (isInView: boolean) => void,
) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    // Trigger initial positioning
    onReposition();
  }, []);

  useEffect(() => {
    if (targetElement != null && resolution != null) {
      const rootElement = editor.getRootElement();
      const rootScrollParent = rootElement != null ? getScrollParent(rootElement, false) : document.body;
      let ticking = false;
      let previousIsInView = isTriggerVisibleInNearestScrollContainer(targetElement, rootScrollParent);
      const handleScroll = function () {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            onReposition();
            ticking = false;
          });
          ticking = true;
        }
        const isInView = isTriggerVisibleInNearestScrollContainer(targetElement, rootScrollParent);
        if (isInView !== previousIsInView) {
          previousIsInView = isInView;
          if (onVisibilityChange != null) {
            onVisibilityChange(isInView);
          }
        }
      };
      const resizeObserver = new ResizeObserver(onReposition);
      window.addEventListener('resize', onReposition);
      document.addEventListener('scroll', handleScroll, {
        capture: true,
        passive: true,
      });
      resizeObserver.observe(targetElement);
      return () => {
        resizeObserver.unobserve(targetElement);
        window.removeEventListener('resize', onReposition);
        document.removeEventListener('scroll', handleScroll, {capture: true});
      };
    }

    return () => null;
  }, [targetElement, editor, onVisibilityChange, onReposition, resolution]);
}

function LexicalPopoverMenu<TOption extends TypeaheadOption>({
  close,
  editor,
  resolution,
  setResolution,
  options,
  anchorClassName,
  menuRenderFn,
  containerId,
  onSelectOption,
  onMenuVisibilityChange,
  isReversed = false,
}: {
  close: () => void;
  editor: LexicalEditor;
  resolution: Resolution;
  setResolution: (r: Resolution | null) => void;
  containerId: string;
  anchorClassName?: string;
  options: Array<TOption>;
  menuRenderFn: MenuRenderFn<TOption>;
  onSelectOption: (
    option: TOption,
    textNodeContainingQuery: TextNode | null,
    closeMenu: () => void,
    matchingString: string,
  ) => void;
  onMenuVisibilityChange?: (visible: boolean) => void;
  isReversed?: boolean;
}): JSX.Element | null {
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedIndex, setHighlightedIndex] = useState<null | number>(null);
  const defaultSelectedIndex = isReversed ? options.length - 1 : 0;

  const anchorElementRef = useMenuAnchorRef({
    containerId,
    resolution: resolution,
    setResolution,
    className: `typeahead-menu ${anchorClassName || ''}`,
    menuVisible,
    onAdded: () => {
      // when the menu first renders, we scroll to the initially selected element
      scrollToOption(defaultSelectedIndex, options);
    },
  });

  useEffect(() => {
    setHighlightedIndex(defaultSelectedIndex);
  }, [defaultSelectedIndex]);

  useEffect(() => {
    if (selectedIndex !== null) {
      scrollToOption(selectedIndex, options);
    }
  }, [options, selectedIndex]);

  const selectOptionAndCleanUp = useCallback(
    (selectedEntry: TOption) => {
      editor.update(() => {
        const textNodeContainingQuery = splitNodeContainingQuery(editor, resolution.match);

        onSelectOption(selectedEntry, textNodeContainingQuery, close, resolution.match.matchingString);
      });
    },
    [close, editor, resolution.match, onSelectOption],
  );

  const updateSelectedIndex = useCallback(
    (index: number) => {
      const rootElem = editor.getRootElement();
      if (rootElem !== null) {
        rootElem.setAttribute('aria-activedescendant', `typeahead-item-${index}`);
        setHighlightedIndex(index);
      }
    },
    [editor],
  );

  useEffect(() => {
    return () => {
      const rootElem = editor.getRootElement();
      if (rootElem !== null) {
        rootElem.removeAttribute('aria-activedescendant');
      }
    };
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_DOWN_COMMAND,
        payload => {
          const event = payload;
          if (options !== null && options.length && selectedIndex !== null) {
            const newSelectedIndex = (selectedIndex + 1) % options.length;
            updateSelectedIndex(newSelectedIndex);
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_UP_COMMAND,
        payload => {
          const event = payload;
          if (options !== null && options.length && selectedIndex !== null) {
            const newSelectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
            updateSelectedIndex(newSelectedIndex);
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ESCAPE_COMMAND,
        payload => {
          const event = payload;
          event.preventDefault();
          event.stopImmediatePropagation();
          close();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_TAB_COMMAND,
        payload => {
          const event = payload;
          if (options === null || selectedIndex === null || options[selectedIndex] == null) {
            return false;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          selectOptionAndCleanUp(options[selectedIndex]);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event: KeyboardEvent | null) => {
          if (options === null || selectedIndex === null || options[selectedIndex] == null) {
            return false;
          }
          if (event !== null) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          selectOptionAndCleanUp(options[selectedIndex]);
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [selectOptionAndCleanUp, close, editor, options, selectedIndex, updateSelectedIndex]);

  const listItemProps = useMemo(
    () => ({
      options,
      selectOptionAndCleanUp,
      selectedIndex,
      setHighlightedIndex,
    }),
    [selectOptionAndCleanUp, selectedIndex, options],
  );

  const menu = menuRenderFn(anchorElementRef, listItemProps, resolution.match.matchingString);

  useLayoutEffect(() => {
    if (onMenuVisibilityChange && menu !== null && !menuVisible) {
      onMenuVisibilityChange(true);
      setMenuVisible(true);
    } else if (onMenuVisibilityChange && menu === null && menuVisible) {
      onMenuVisibilityChange(false);
      setMenuVisible(false);
    }
  }, [menu, menuVisible, onMenuVisibilityChange]);

  return menu;
}

interface UseMenuAnchorRefOptions {
  resolution: Resolution | null;
  containerId: string;
  setResolution: (r: Resolution | null) => void;
  className?: string;
  menuVisible?: boolean;
  onAdded?: () => void;
}

function useMenuAnchorRef(opt: UseMenuAnchorRefOptions): MutableRefObject<HTMLElement> {
  const {resolution, setResolution, className, containerId, onAdded} = opt;
  const [editor] = useLexicalComposerContext();
  const anchorElementRef = useRef<HTMLElement>(document.createElement('div'));
  const positionMenu = useCallback(() => {
    const rootElement = editor.getRootElement();
    const containerDiv = anchorElementRef.current;
    const menuEle = containerDiv.firstChild as Element;

    if (rootElement !== null && resolution !== null) {
      const {left, top, height} = resolution.getRect();
      containerDiv.style.top = `${top + window.pageYOffset}px`;
      containerDiv.style.left = `${left + window.pageXOffset}px`;
      containerDiv.style.height = `${height}px`;

      if (menuEle !== null) {
        const menuRect = menuEle.getBoundingClientRect();
        const menuHeight = menuRect.height;
        const menuWidth = menuRect.width;

        const rootElementRect = rootElement.getBoundingClientRect();

        if (left + menuWidth > rootElementRect.right) {
          containerDiv.style.left = `${rootElementRect.right - menuWidth + window.pageXOffset}px`;
        }
        const margin = 10;
        if (
          (top + menuHeight > window.innerHeight || top + menuHeight > rootElementRect.bottom) &&
          top - rootElementRect.top > menuHeight
        ) {
          containerDiv.style.top = `${top - menuHeight + window.pageYOffset - (height + margin)}px`;
        }
      }

      if (!containerDiv.isConnected) {
        if (className) {
          containerDiv.className = className;
        }
        containerDiv.setAttribute('aria-label', 'Typeahead menu');
        containerDiv.setAttribute('id', containerId);
        containerDiv.setAttribute('role', 'listbox');
        containerDiv.style.display = 'block';
        containerDiv.style.position = 'absolute';
        document.body.append(containerDiv);
        onAdded?.();
      }
      anchorElementRef.current = containerDiv;
      rootElement.setAttribute('aria-controls', 'typeahead-menu');
    }
  }, [editor, resolution, className, containerId, onAdded]);

  useEffect(() => {
    return () => {
      anchorElementRef.current.remove();
    };
  }, []);

  const onVisibilityChange = useCallback(
    (isInView: boolean) => {
      if (resolution !== null) {
        if (!isInView) {
          setResolution(null);
        }
      }
    },
    [resolution, setResolution],
  );

  useDynamicPositioning(resolution, anchorElementRef.current, positionMenu, onVisibilityChange);

  return anchorElementRef;
}

export type TypeaheadMenuPluginProps<TOption extends TypeaheadOption> = {
  onQueryChange: (matchingString: string | null) => void;
  onSelectOption: (
    option: TOption,
    textNodeContainingQuery: TextNode | null,
    closeMenu: () => void,
    matchingString: string,
  ) => void;
  options: Array<TOption>;
  menuRenderFn: MenuRenderFn<TOption>;
  triggerFn: TriggerFn;
  onOpen?: (resolution: Resolution) => void;
  onClose?: () => void;
  anchorClassName?: string;
  containerId: string;
  isReversed?: boolean;
};

export type TriggerFn = (text: string, editor: LexicalEditor) => QueryMatch | null;

export function TypeaheadMenuPlugin<TOption extends TypeaheadOption>({
  options,
  onQueryChange,
  onSelectOption,
  onOpen,
  onClose,
  menuRenderFn,
  triggerFn,
  anchorClassName,
  containerId,
  isReversed = false,
}: TypeaheadMenuPluginProps<TOption>): JSX.Element | null {
  const previousText = useRef<string>('');
  const [editor] = useLexicalComposerContext();
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const closeTypeahead = useCallback(() => {
    setResolution(null);
    if (onClose != null && resolution !== null) {
      onClose();
    }
  }, [onClose, resolution]);

  const openTypeahead = useCallback(
    (res: Resolution) => {
      setResolution(res);
      if (onOpen != null && resolution === null) {
        onOpen(res);
      }
    },
    [onOpen, resolution],
  );

  useEffect(() => {
    if (resolution === null && menuVisible) {
      setMenuVisible(false);
    }
    const updateListener = () => {
      editor.getEditorState().read(() => {
        const range = document.createRange();
        const selection = $getSelection();
        const text = getQueryTextForSearch(editor);

        if (!$isRangeSelection(selection) || !selection.isCollapsed() || text === null || range === null) {
          closeTypeahead();
          return;
        }

        const isInitialTextSet = previousText.current === '' && text.length > 1;
        previousText.current = text;
        if (isInitialTextSet) {
          // Do not trigger the typeahead when the input first loads (goes from empty to a text larger than 1 char)
          return;
        }
        const match = triggerFn(text, editor);
        onQueryChange(match ? match.matchingString : null);

        if (match !== null && !isSelectionOnEntityBoundary(editor, match.leadOffset)) {
          const isRangePositioned = tryToPositionRange(match.leadOffset, range);
          if (isRangePositioned !== null) {
            startTransition(() =>
              openTypeahead({
                getRect: () => range.getBoundingClientRect(),
                match,
              }),
            );
            return;
          }
        }
        closeTypeahead();
      });
    };

    const removeUpdateListener = editor.registerUpdateListener(updateListener);

    return () => {
      removeUpdateListener();
    };
  }, [editor, triggerFn, onQueryChange, resolution, closeTypeahead, openTypeahead, menuVisible, setMenuVisible]);

  return resolution === null || editor === null || options.length === 0 ? null : (
    <LexicalPopoverMenu
      close={closeTypeahead}
      containerId={containerId}
      resolution={resolution}
      setResolution={setResolution}
      editor={editor}
      anchorClassName={anchorClassName}
      options={options}
      menuRenderFn={menuRenderFn}
      onSelectOption={onSelectOption}
      onMenuVisibilityChange={setMenuVisible}
      isReversed={isReversed}
    />
  );
}
