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
import {isEnterKey, isEscapeKey, isKey, isOneOfKeys, KEY} from 'Util/KeyboardUtil';

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

const cleanUp = () => {
  if (container) {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    container = undefined;
  }
};

const ContextMenu: React.FC<ContextMenuProps> = ({entries, defaultIdentifier = 'ctx-menu-item', posX, posY}) => {
  const [mainDiv, setMainDiv] = useState<HTMLDivElement>();
  const [selected, setSelected] = useState<ContextMenuEntry>();

  const style = useMemo<React.CSSProperties>(() => {
    const left = mainDiv && window.innerWidth - posX < mainDiv.offsetWidth ? posX - mainDiv.offsetWidth : posX;
    const top = Math.max(
      mainDiv && window.innerHeight - posY < mainDiv.offsetHeight ? posY - mainDiv.offsetHeight : posY,
      0,
    );
    return {
      left,
      top,
      visibility: mainDiv ? 'unset' : 'hidden',
    };
  }, [mainDiv]);

  useEffect(() => {
    const onWheel = (event: MouseEvent) => event.preventDefault();

    const onKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault();
      if (isEscapeKey(event)) {
        cleanUp();
      }
      if (isOneOfKeys(event, [KEY.ARROW_UP, KEY.ARROW_DOWN])) {
        if (!entries.includes(selected)) {
          const index = isKey(event, KEY.ARROW_UP) ? entries.length - 1 : 0;
          setSelected(entries[index]);
          return;
        }
        const direction = isKey(event, KEY.ARROW_UP) ? -1 : 1;
        const nextIndex = (entries.indexOf(selected) + direction + entries.length) % entries.length;
        setSelected(entries[nextIndex]);
      }
      if (isEnterKey(event)) {
        if (selected) {
          cleanUp();
          selected.click?.();
        }
      }
    };

    const onMouseDown = (event: MouseEvent): void => {
      const isOutsideClick = mainDiv && !mainDiv.contains(event.target as Node);
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
  }, [mainDiv, selected]);

  return (
    <div className="ctx-menu" ref={setMainDiv} style={{maxHeight: window.innerHeight, ...style}}>
      {entries.map((entry, index) =>
        entry.isSeparator ? (
          <div key={`${index}`} className="ctx-menu__separator" />
        ) : (
          <div
            key={`${index}`}
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
            data-uie-name={entry.identifier || defaultIdentifier}
            title={entry.title || entry.label}
            className={cx('ctx-menu__item', {
              'ctx-menu__item--checked': entry.isChecked,
              'ctx-menu__item--disabled': entry.isDisabled,
              selected: entry === selected,
            })}
          >
            {entry.icon && <Icon name={entry.icon} className="ctx-menu__icon" />}
            <span>{entry.label}</span>
            {entry.isChecked && <Icon.Check className="ctx-menu__check" data-uie-name="ctx-menu-check" />}
          </div>
        ),
      )}
    </div>
  );
};

export const showContextMenu = (
  event: MouseEvent | React.MouseEvent,
  entries: ContextMenuEntry[],
  identifier: string,
) => {
  event.preventDefault();
  event.stopPropagation();

  cleanUp();

  container = document.createElement('div');
  document.body.appendChild(container);
  ReactDOM.render(
    <ContextMenu entries={entries} defaultIdentifier={identifier} posX={event.clientX} posY={event.clientY} />,
    container,
  );
};
