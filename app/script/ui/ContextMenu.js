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

  function cleanup() {
    [...document.querySelectorAll('.ctx-menu')].forEach((menu) => menu.remove());
  }

  function initListener() {
    window.addEventListener('keyup', (e) => {
      if (e.keyCode === 27) {
        cleanup();
      }
    });
    window.addEventListener('click', cleanup);
    window.addEventListener('resize', cleanup);
  }

  function build(entries) {
    let menu = document.createElement('div');
    menu.classList.add('ctx-menu', 'conversation-input-emoji-list');

    for (const entry of entries) {
      const element = document.createElement('div');
      element.classList.add('emoji');
      element.innerText = entry.title;
      element.onclick = function() {
        cleanup();
        entry.callback();
      };
      menu.appendChild(element)
    }

    return menu
  }

  /**
   *
   * @param event
   * @param options
   */
  function from(event, entries) {
    event.preventDefault();

    cleanup();

    const click_x = event.clientX;
    const click_y = event.clientY;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let menu = build(entries);
    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;

    menu.style.left = `${(((windowWidth - click_x) < menuWidth ) ? click_x - menuWidth : click_x)}px`;
    menu.style.top = `${(((windowHeight - click_y) < menuHeight ) ? click_y - menuHeight : click_y)}px`;
    menu.style.visibility = '';
  }

  initListener();

  return {
    from,
  }

})();
