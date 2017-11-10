/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

window.debugGrid = function() {
  const body = document.body;
  const html = document.getElementsByTagName('html')[0];
  const grid = document.getElementsByClassName('debug-grid')[0] || document.createElement('div');
  if (html.classList.contains('debug')) {
    html.classList.remove('debug');
    if (grid) {
      grid.parentNode.removeChild(grid);
    }
  } else {
    grid.className = 'debug-grid';
    body.appendChild(grid);
    grid.style.height =
      Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight) + 'px';
    html.classList.add('debug');
  }
};

const KEY_G = 71;

document.onkeydown = function(event) {
  event = event || window.event;
  if (event.target.tagName === 'BODY' && event.keyCode === KEY_G) {
    debugGrid();
  }
};
