/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {ComponentType, CSSProperties, ReactNode, SVGProps, useEffect, useMemo, useRef, useState} from 'react';

import {CSSObject} from '@emotion/react';
import cx from 'classnames';
import {createRoot, Root} from 'react-dom/client';

import {Availability} from '@wireapp/protocol-messaging';
import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {IgnoreOutsideClickWrapper} from 'Components/InputBar/util/clickHandlers';
import {useMessageActionsState} from 'Components/MessagesList/Message/ContentMessage/MessageActions/MessageActions.state';
import {isEnterKey, isEscapeKey, isKey, isOneOfKeys, isSpaceKey, KEY} from 'Util/KeyboardUtil';

import {useActiveWindowState} from '../hooks/useActiveWindow';

export interface ContextMenuEntry {
  availability?: Availability.Type;
  click?: (event?: MouseEvent) => void;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  identifier?: string;
  isChecked?: boolean;
  isDisabled?: boolean;
  isSeparator?: boolean;
  label?: string;
  title?: string;
  css?: CSSObject;
}

type Placement =
  | 'bottom-start'
  | 'bottom-end'
  | 'top-start'
  | 'top-end'
  | 'right-start'
  | 'right-end'
  | 'left-start'
  | 'left-end';

interface ContextMenuProps {
  defaultIdentifier?: string;
  entries: ContextMenuEntry[];
  placeholder?: ReactNode;
  posX: number;
  posY: number;
  resetMenuStates?: () => void;
  anchorEl?: HTMLElement | null;
  placement?: Placement;
  offset?: number;
}

let container: HTMLDivElement | undefined;
let previouslyFocused: HTMLElement;
let reactRoot: Root;

// Unmount and remove the container from DOM
const cleanUp = () => {
  const {activeWindow} = useActiveWindowState.getState();

  if (container) {
    reactRoot.unmount();
    activeWindow.document.body.removeChild(container);
    container = undefined;
  }
};

// Clamping the value between min and max
const clampValue = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const getPositionFromPlacement = (
  anchorRect: DOMRect,
  menuW: number,
  menuH: number,
  placement: Placement = 'bottom-start',
  offset: number,
): {left: number; top: number} => {
  switch (placement) {
    case 'bottom-start':
      return {left: anchorRect.left, top: anchorRect.bottom + offset};
    case 'bottom-end':
      return {left: anchorRect.right - menuW, top: anchorRect.bottom + offset};
    case 'top-start':
      return {left: anchorRect.left, top: anchorRect.top - menuH - offset};
    case 'top-end':
      return {left: anchorRect.right - menuW, top: anchorRect.top - menuH - offset};
    case 'right-start':
      return {left: anchorRect.right + offset, top: anchorRect.top};
    case 'right-end':
      return {left: anchorRect.right + offset, top: anchorRect.bottom - menuH};
    case 'left-start':
      return {left: anchorRect.left - menuW - offset, top: anchorRect.top};
    case 'left-end':
      return {left: anchorRect.left - menuW - offset, top: anchorRect.bottom - menuH};
  }
};

const getButtonId = (label: string): string => `btn-${label?.split(' ').join('-').toLowerCase()}`;

const contextMenuClassName = 'ctx-menu';
const msgMenuIdentifier = 'message-options-menu';

const ContextMenu = ({
  entries,
  defaultIdentifier = `${contextMenuClassName}-item`,
  posX,
  posY,
  resetMenuStates,
  placeholder,
  anchorEl,
  placement,
  offset = 8,
}: ContextMenuProps) => {
  const {activeWindow} = useActiveWindowState();
  const [activeElement, setActiveElement] = useState<HTMLUListElement>();
  const placeholderElement = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<ContextMenuEntry>();

  const style = useMemo<CSSProperties>(() => {
    const viewportWidth = activeWindow.innerWidth;
    const viewportHeight = activeWindow.innerHeight;

    const menuWidth = activeElement?.offsetWidth ?? 0;
    const menuHeight = activeElement?.offsetHeight ?? 0;

    let leftPx = 0;
    let topPx = 0;

    if (anchorEl) {
      const anchorRect = anchorEl.getBoundingClientRect();
      const position = getPositionFromPlacement(anchorRect, menuWidth, menuHeight, placement, offset);
      leftPx = position.left;
      topPx = position.top;
    } else {
      const fitsRight = viewportWidth - posX >= menuWidth;
      const fitsBelow = viewportHeight - posY >= menuHeight;

      leftPx = fitsRight ? posX : posX - menuWidth;
      topPx = fitsBelow ? posY : posY - menuHeight;
    }

    leftPx = clampValue(leftPx, 0, Math.max(0, viewportWidth - menuWidth));
    topPx = clampValue(topPx, 0, Math.max(0, viewportHeight - menuHeight));

    return {
      position: 'fixed',
      left: leftPx,
      top: topPx,
      visibility: activeElement || placeholderElement.current ? 'unset' : 'hidden',
    };
  }, [activeElement, placeholderElement, anchorEl, placement, offset, posX, posY, activeWindow]);

  useEffect(() => {
    if (selected) {
      // remove quotes from label
      const labelWithoutQuotes = selected?.label?.replaceAll('"', '');

      // context menu options such as 10 seconds etc begings with digit which is an invalid querySelector
      // param append btn- to avoid such errors
      const selectedButton = activeWindow.document.querySelector(
        `#${getButtonId(labelWithoutQuotes!)}`,
      ) as HTMLButtonElement;
      selectedButton?.focus();
    }
  }, [selected]);

  useEffect(() => {
    const onWheel = (event: MouseEvent) => event.preventDefault();

    //after opening the menu first time, select the first option
    if (!selected) {
      setSelected(entries[0]);
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault();
      if (isEscapeKey(event) || isKey(event, KEY.TAB)) {
        // escape/tab key press while the menu is open will close the menu and focus the trigerer
        cleanUp();
        previouslyFocused.focus();
        resetMsgMenuStates(true);
      }

      if (isOneOfKeys(event, [KEY.ARROW_UP, KEY.ARROW_DOWN])) {
        if (!entries.includes(selected!)) {
          const index = isKey(event, KEY.ARROW_DOWN) ? 0 : entries.length - 1;
          setSelected(entries[index]);
          return;
        }
        const direction = isKey(event, KEY.ARROW_DOWN) ? 1 : -1;
        const nextIndex = (entries.indexOf(selected!) + direction + entries.length) % entries.length;
        setSelected(entries[nextIndex]);
      }
      if (isEnterKey(event) || isSpaceKey(event)) {
        if (selected) {
          cleanUp();
          resetMsgMenuStates();
          selected.click?.();
          previouslyFocused.focus();
        }
      }
    };

    const onMouseDown = (event: MouseEvent): void => {
      const isOutsideClick = entries.length
        ? activeElement && !activeElement.contains(event.target as Node)
        : placeholderElement && !placeholderElement.current?.contains(event.target as Node);

      if (isOutsideClick) {
        cleanUp();
        resetMsgMenuStates(isOutsideClick);
      }
    };

    activeWindow.addEventListener('wheel', onWheel);
    activeWindow.addEventListener('keydown', onKeyDown);
    activeWindow.addEventListener('mousedown', onMouseDown);
    activeWindow.addEventListener('resize', cleanUp);

    return () => {
      activeWindow.removeEventListener('wheel', onWheel);
      activeWindow.removeEventListener('keydown', onKeyDown);
      activeWindow.removeEventListener('mousedown', onMouseDown);
      activeWindow.removeEventListener('resize', cleanUp);
    };
  }, [activeElement, selected, activeWindow]);

  const {handleMenuOpen} = useMessageActionsState();
  const resetMsgMenuStates = (isOutsideClick = false) => {
    if (defaultIdentifier === msgMenuIdentifier) {
      handleMenuOpen?.(false);

      if (isOutsideClick) {
        resetMenuStates?.();
      }
    }
  };

  return (
    <IgnoreOutsideClickWrapper>
      <div className="overlay">
        {entries.length ? (
          <ul
            className={contextMenuClassName}
            ref={el => setActiveElement(el ?? undefined)}
            style={{maxHeight: activeWindow.innerHeight, ...style}}
            role="menu"
          >
            {entries.map((entry, index) =>
              entry.isSeparator ? (
                <li key={`${index}`} className={`${contextMenuClassName}__separator`} />
              ) : (
                <li
                  key={`${index}`}
                  className={cx(`${contextMenuClassName}__item`, {
                    [`${contextMenuClassName}__item--checked`]: entry.isChecked,
                    [`${contextMenuClassName}__item--disabled`]: entry.isDisabled,
                    selected: entry === selected,
                  })}
                  role="menuitem"
                  aria-haspopup="true"
                  {...(entry.css ? {css: entry.css} : {})}
                >
                  <button
                    id={getButtonId(entry.label!)}
                    className={`${contextMenuClassName}__button`}
                    type="button"
                    data-uie-name={entry.identifier || defaultIdentifier}
                    title={entry.title || entry.label}
                    {...(entry.isDisabled
                      ? undefined
                      : {
                          onClick: event => {
                            event.preventDefault();
                            cleanUp();
                            resetMsgMenuStates();
                            entry.click?.(event.nativeEvent);
                          },
                          onMouseEnter: () => {
                            setSelected(undefined);
                          },
                        })}
                  >
                    {entry.icon && <entry.icon className={`${contextMenuClassName}__icon`} />}
                    <span>{entry.label}</span>
                    {entry.isChecked && (
                      <Icon.CheckIcon
                        className={`${contextMenuClassName}__check`}
                        data-uie-name={`${contextMenuClassName}-check`}
                      />
                    )}
                  </button>
                </li>
              ),
            )}
          </ul>
        ) : (
          <div ref={placeholderElement} className={`${contextMenuClassName}__placeholder`} style={style}>
            {placeholder}
          </div>
        )}
      </div>
    </IgnoreOutsideClickWrapper>
  );
};

export const showContextMenu = ({
  entries,
  event,
  identifier,
  placeholder,
  resetMenuStates,
  anchor,
  placement,
  offset,
}: {
  event: MouseEvent | React.MouseEvent;
  entries: ContextMenuEntry[];
  identifier: string;
  resetMenuStates?: () => void;
  placeholder?: ReactNode;
  anchor?: HTMLElement | undefined;
  placement?: Placement;
  offset?: number;
}) => {
  const {activeWindow} = useActiveWindowState.getState();
  event.preventDefault();
  event.stopPropagation();

  previouslyFocused = activeWindow.document.activeElement as HTMLElement;
  cleanUp();

  container = activeWindow.document.createElement('div');
  activeWindow.document.body.appendChild(container);
  reactRoot = createRoot(container);
  reactRoot.render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <ContextMenu
        entries={entries}
        defaultIdentifier={identifier}
        posX={event.clientX}
        posY={event.clientY}
        resetMenuStates={resetMenuStates}
        placeholder={placeholder}
        anchorEl={anchor}
        placement={placement}
        offset={offset}
      />
    </StyledApp>,
  );
};
