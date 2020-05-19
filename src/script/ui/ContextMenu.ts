/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import ko from 'knockout';

import {KEY, isOneOfKeys, isEnterKey, isEscapeKey} from 'Util/KeyboardUtil';

export interface ContextMenuEntry {
  click?: (event: MouseEvent) => void;
  icon?: string;
  identifier?: string;
  isChecked?: boolean;
  isDisabled?: boolean;
  isSeparator?: boolean;
  label?: string;
  title?: string;
}

const _addListeners = () => {
  window.addEventListener('wheel', _onWheel);
  window.addEventListener('keydown', _onKeyDown);
  window.addEventListener('mousedown', _onMouseDown);
  window.addEventListener('resize', _cleanup);
};

const _onKeyDown = (keyboardEvent: KeyboardEvent): void => {
  keyboardEvent.preventDefault();

  if (isEscapeKey(keyboardEvent)) {
    return _cleanup();
  }

  const expectedKeys = [KEY.ARROW_UP, KEY.ARROW_DOWN];

  if (isOneOfKeys(keyboardEvent, expectedKeys)) {
    return _rotateItem(keyboardEvent.key);
  }

  if (isEnterKey(keyboardEvent)) {
    _triggerItem();
  }
};

const _onMouseDown = (event: MouseEvent): void => {
  const entry = document.querySelector<HTMLElement>('.ctx-menu');
  const shouldCloseMenu = entry && !entry.contains(event.target as Node);
  if (shouldCloseMenu) {
    _cleanup();
  }
};

const _onWheel = (event: MouseEvent): void => event.preventDefault();

const _rotateItem = (key: string): void => {
  const entries = Array.from(document.querySelectorAll('.ctx-menu-item'));
  const entry = document.querySelector('.ctx-menu-item.selected');

  if (entries.length) {
    if (!entry) {
      const index = key === KEY.ARROW_UP ? entries.length - 1 : 0;
      return entries[index].classList.add('selected');
    }

    const direction = key === KEY.ARROW_UP ? -1 : 1;
    const nextIndex = (entries.indexOf(entry) + direction + entries.length) % entries.length;
    const nextEntry = entries[nextIndex];

    nextEntry.classList.add('selected');
    entry.classList.remove('selected');
  }
};

const _removeListeners = (): void => {
  window.removeEventListener('wheel', _onWheel);
  window.removeEventListener('keydown', _onKeyDown);
  window.removeEventListener('mousedown', _onMouseDown);
  window.removeEventListener('resize', _cleanup);
};

const _triggerItem = (): void => {
  const entry = document.querySelector<HTMLButtonElement>('.ctx-menu-item.selected');
  if (entry) {
    entry.click();
  }
};

const _cleanup = (): void => {
  Array.from(document.querySelectorAll('.ctx-menu')).forEach(menu => menu.remove());
  _removeListeners();
};

const _build = (entries: ContextMenuEntry[], defaultIdentifier: string) => {
  const menu = document.createElement('div');
  menu.classList.add('ctx-menu');

  entries.forEach(({title, label, click, identifier, icon, isSeparator, isDisabled, isChecked}) => {
    const element = document.createElement('div');
    if (isSeparator) {
      element.classList.add('ctx-menu-separator');
      menu.appendChild(element);
      return;
    }
    element.setAttribute('data-uie-name', identifier || defaultIdentifier || 'ctx-menu-item');
    element.setAttribute('title', title || label || '');
    element.classList.add('ctx-menu-item');
    const itemText = document.createElement('span');
    itemText.innerText = label;
    element.appendChild(itemText);

    if (isDisabled) {
      element.classList.add('ctx-menu-item--disabled');
      menu.appendChild(element);
      return;
    }
    element.onclick = event => {
      event.stopPropagation();
      _cleanup();
      click(event);
    };

    element.onmouseenter = () => {
      const selectedEntry = document.querySelector('.ctx-menu-item.selected');
      if (selectedEntry) {
        selectedEntry.classList.remove('selected');
      }
    };
    if (icon) {
      const iconComponent = document.createElement(icon);
      iconComponent.classList.add('ctx-menu-icon');
      ko.applyBindingsToNode(iconComponent, {component: icon}, undefined);
      element.prepend(iconComponent);
    }

    if (isChecked) {
      element.classList.add('ctx-menu-item--checked');
      const checkIcon = document.createElement('check-icon');
      checkIcon.classList.add('ctx-menu-check');
      checkIcon.setAttribute('data-uie-name', 'ctx-menu-check');
      ko.applyBindingsToNode(checkIcon, {component: 'check-icon'}, undefined);
      element.append(checkIcon);
    }
    menu.appendChild(element);
  });
  return menu;
};

export const Context = {
  /**
   * Build and display custom context menu
   * @param event menu will appear at currentTarget position
   * @param entries configuration to build the menu
   * @param identifier data-uie-name added to all entries
   */
  from: (event: MouseEvent, entries: ContextMenuEntry[], identifier: string): void => {
    event.preventDefault();
    event.stopPropagation();

    _cleanup();

    const clickX = event.clientX;
    const clickY = event.clientY;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const menu = _build(entries, identifier);
    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;

    menu.style.left = `${windowWidth - clickX < menuWidth ? clickX - menuWidth : clickX}px`;
    menu.style.top = `${Math.max(windowHeight - clickY < menuHeight ? clickY - menuHeight : clickY, 0)}px`;
    menu.style.maxHeight = `${windowHeight}px`;
    menu.style.visibility = '';

    _addListeners();
  },
};
