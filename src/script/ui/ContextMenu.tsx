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

import React, {useEffect, useMemo, useState} from 'react';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import Icon from 'Components/Icon';
import {isEnterKey, isEscapeKey, isKey, isOneOfKeys, isSpaceKey, KEY} from 'Util/KeyboardUtil';

export interface ContextMenuEntry {
  click?: (event?: MouseEvent) => void;
  icon?: string;
  identifier?: string;
  isChecked?: boolean;
  isDisabled?: boolean;
  isSeparator?: boolean;
  label?: string;
  title?: string;
}

interface ContextMenuProps {
  defaultIdentifier?: string;
  entries: ContextMenuEntry[];
  posX: number;
  posY: number;
}

let container: HTMLDivElement;
let previouslyFocused: HTMLElement;

const cleanUp = () => {
  if (container) {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    container = undefined;
  }
};

const getButtonId = (label: string): string => {
  return `${label.split(' ').join('-').toLowerCase()}-button`;
};

const ContextMenu: React.FC<ContextMenuProps> = ({entries, defaultIdentifier = 'ctx-menu-item', posX, posY}) => {
  const [mainElement, setMainElement] = useState<HTMLUListElement>();
  const [selected, setSelected] = useState<ContextMenuEntry>();

  const style = useMemo<React.CSSProperties>(() => {
    const left =
      mainElement && window.innerWidth - posX < mainElement.offsetWidth ? posX - mainElement.offsetWidth : posX;
    const top = Math.max(
      mainElement && window.innerHeight - posY < mainElement.offsetHeight ? posY - mainElement.offsetHeight : posY,
      0,
    );
    return {
      left,
      top,
      visibility: mainElement ? 'unset' : 'hidden',
    };
  }, [mainElement]);

  useEffect(() => {
    if (selected) {
      const selectedButton = document.querySelector(`#${getButtonId(selected.label)}`) as HTMLButtonElement;
      selectedButton?.focus();
    }
  }, [selected]);

  useEffect(() => {
    const onWheel = (event: MouseEvent) => event.preventDefault();

    const onKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault();
      if (isEscapeKey(event)) {
        cleanUp();
        previouslyFocused.focus();
      }
      if (isOneOfKeys(event, [KEY.ARROW_UP, KEY.ARROW_DOWN, KEY.TAB])) {
        if (!entries.includes(selected)) {
          const index = isKey(event, KEY.ARROW_DOWN) || isKey(event, KEY.TAB) ? 0 : entries.length - 1;
          setSelected(entries[index]);
          return;
        }
        const direction = isKey(event, KEY.ARROW_DOWN) || isKey(event, KEY.TAB) ? 1 : -1;
        const nextIndex = (entries.indexOf(selected) + direction + entries.length) % entries.length;
        setSelected(entries[nextIndex]);
      }
      if (isEnterKey(event) || isSpaceKey(event)) {
        if (selected) {
          cleanUp();
          selected.click?.();
        }
      }
    };

    const onMouseDown = (event: MouseEvent): void => {
      const isOutsideClick = mainElement && !mainElement.contains(event.target as Node);
      if (isOutsideClick) {
        cleanUp();
      }
    };

    window.addEventListener('wheel', onWheel);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', cleanUp);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', cleanUp);
    };
  }, [mainElement, selected]);

  return (
    <ul className="ctx-menu" ref={setMainElement} style={{maxHeight: window.innerHeight, ...style}}>
      {entries.map((entry, index) =>
        entry.isSeparator ? (
          <li key={`${index}`} className="ctx-menu__separator" />
        ) : (
          <li
            key={`${index}`}
            className={cx('ctx-menu__item', {
              'ctx-menu__item--checked': entry.isChecked,
              'ctx-menu__item--disabled': entry.isDisabled,
              selected: entry === selected,
            })}
          >
            <button
              id={getButtonId(entry.label)}
              className="ctx-menu__button"
              data-uie-name={entry.identifier || defaultIdentifier}
              title={entry.title || entry.label}
              {...(entry.isDisabled
                ? undefined
                : {
                    onClick: event => {
                      event.preventDefault();
                      cleanUp();
                      entry.click?.(event.nativeEvent);
                    },
                    onMouseEnter: () => {
                      setSelected(undefined);
                    },
                  })}
            >
              {entry.icon && <Icon name={entry.icon} className="ctx-menu__icon" />}
              <span>{entry.label}</span>
              {entry.isChecked && <Icon.Check className="ctx-menu__check" data-uie-name="ctx-menu-check" />}
            </button>
          </li>
        ),
      )}
    </ul>
  );
};

export const showContextMenu = (
  event: MouseEvent | React.MouseEvent,
  entries: ContextMenuEntry[],
  identifier: string,
) => {
  event.preventDefault();
  event.stopPropagation();

  previouslyFocused = document.activeElement as HTMLElement;
  cleanUp();

  container = document.createElement('div');
  document.body.appendChild(container);
  ReactDOM.render(
    <ContextMenu entries={entries} defaultIdentifier={identifier} posX={event.clientX} posY={event.clientY} />,
    container,
  );
};
