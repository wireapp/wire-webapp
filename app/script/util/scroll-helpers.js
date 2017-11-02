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

$.fn.scroll_end = function() {
  const element = $(this).get(0);
  if (!element) {
    return;
  }
  return element.scrollHeight - element.clientHeight;
};

$.fn.scroll_to_bottom = function() {
  const $element = $(this);
  if ($element.length === 0) {
    return;
  }
  $element.scrollTop($element[0].scrollHeight);
  return window.setTimeout(() => {
    if (!$(this).is_scrolled_bottom()) {
      return $element.scrollTop($element[0].scrollHeight);
    }
  }, 200);
};

$.fn.scroll_by = function(distance) {
  const $element = $(this);
  if ($element.length === 0) {
    return;
  }
  const scroll_top = $element[0].scrollTop;
  return $element.scrollTop(scroll_top + distance);
};

$.fn.is_scrolled_bottom = function(offset) {
  if (offset == null) {
    offset = 0;
  }
  const $element = $(this);
  if ($element.length === 0) {
    return;
  }
  const scroll_top = Math.ceil($element.scrollTop());
  const scroll_height = $element[0].scrollHeight;
  const height = $element[0].clientHeight;
  return scroll_top + height + offset >= scroll_height;
};

$.fn.is_scrolled_top = function() {
  const $element = $(this);
  if ($element.length === 0) {
    return;
  }
  return $element.scrollTop() === 0;
};

$.fn.is_scrollable = function() {
  const element = $(this).get(0);
  if (!element) {
    return;
  }
  return element.scrollHeight > element.clientHeight;
};
