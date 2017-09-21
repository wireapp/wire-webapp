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

'use strict';

window.z = window.z || {};
window.z.util = z.util || {};

z.util.KeyUtil = {
  // http://stackoverflow.com/a/1064139
  insert_at_caret: function(areaId, text) {
    const textArea = document.getElementById(areaId);
    if (!textArea) {
      return;
    }

    const scrollPos = textArea.scrollTop;
    let strPos = 0;
    const br = textArea.selectionStart || textArea.selectionStart === '0' ? 'ff' : document.selection ? 'ie' : false;

    if (br === 'ie') {
      textArea.focus();
      const range = document.selection.createRange();
      range.moveStart('character', -textArea.value.length);
      strPos = range.text.length;
    } else if (br === 'ff') {
      strPos = textArea.selectionStart;
    }

    const front = textArea.value.substring(0, strPos);
    const back = textArea.value.substring(strPos, textArea.value.length);

    textArea.value = `${front}${text}${back}`;
    strPos = strPos + text.length;

    if (br === 'ie') {
      textArea.focus();
      const ieRange = document.selection.createRange();
      ieRange.moveStart('character', -textArea.value.length);
      ieRange.moveStart('character', strPos);
      ieRange.moveEnd('character', 0);
      ieRange.select();
    } else if (br === 'ff') {
      textArea.selectionStart = strPos;
      textArea.selectionEnd = strPos;
      textArea.focus();
    }

    textArea.scrollTop = scrollPos;
  },
};
