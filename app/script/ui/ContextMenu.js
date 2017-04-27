/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.ui = z.ui || {};

z.ui.Context = (() => {

  let onWheel;
  let onKeydown;

  function addListeners() {
    window.addEventListener('wheel', onWheel = (e) => e.preventDefault());
    window.addEventListener('keydown', onKeydown = (e) => {
      e.preventDefault();

      if (e.keyCode === z.util.KEYCODE.ESC) {
        cleanup();
      } else if (e.keyCode === z.util.KEYCODE.ARROW_UP || e.keyCode === z.util.KEYCODE.ARROW_DOWN) {
        rotateItem(e.keyCode);
      } else if (e.keyCode === z.util.KEYCODE.ENTER) {
        triggerItem();
      }
    });
    window.addEventListener('click', cleanup);
    window.addEventListener('resize', cleanup);
  }

  function triggerItem() {
    const entry = document.querySelector('.ctx-menu-item.selected');
    if (entry !== null) {
      entry.click();
    }
  }

  function rotateItem(keyCode) {
    const entries = Array.from(document.querySelectorAll('.ctx-menu-item'));
    const entry = document.querySelector('.ctx-menu-item.selected');

    if (entries.length === 0) {
      return;
    }

    if (entry === null) {
      const index = keyCode === z.util.KEYCODE.ARROW_UP ? entries.length - 1 : 0;
      return entries[index].classList.add('selected');
    }

    const direction = keyCode === z.util.KEYCODE.ARROW_UP ? -1 : 1;
    const nextEntry = entries[((entries.indexOf(entry) + direction) + entries.length) % entries.length];
    nextEntry.classList.add('selected');
    entry.classList.remove('selected');
  }

  function removeListeners() {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('click', cleanup);
    window.removeEventListener('resize', cleanup);
  }

  function cleanup() {
    [...document.querySelectorAll('.ctx-menu')].forEach((menu) => menu.remove());
    removeListeners();
  }

  function build(entries, identifier) {
    const menu = document.createElement('div');
    menu.classList.add('ctx-menu');

    for (const entry of entries) {
      const element = document.createElement('div');
      element.setAttribute('data-uie-name', identifier || 'ctx-menu');
      element.classList.add('ctx-menu-item');
      element.innerText = entry.label;
      element.onclick = function(event) {
        event.stopPropagation();
        cleanup();
        entry.click();
      };
      menu.appendChild(element);
    }

    return menu;
  }

  /**
   * Build and display custom context menu
   * @param {Event} event - menu will appear at currentTarget position
   * @param {Array} entries - configuration to build the menu {label: 'label', click: function() {}}
   * @param {string} identifier - data-uie-name added to all entries
   * @returns {undefined}
   */
  function from(event, entries, identifier) {
    event.preventDefault();
    event.stopPropagation();

    cleanup();

    const click_x = event.clientX;
    const click_y = event.clientY;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const menu = build(entries, identifier);
    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;

    menu.style.left = `${(((windowWidth - click_x) < menuWidth) ? click_x - menuWidth : click_x)}px`;
    menu.style.top = `${(((windowHeight - click_y) < menuHeight) ? click_y - menuHeight : click_y)}px`;
    menu.style.visibility = '';

    addListeners();
  }

  return {
    from,
  };

})();
