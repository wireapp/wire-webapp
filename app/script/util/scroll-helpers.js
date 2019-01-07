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

import $ from 'jquery';

$.fn.scrollEnd = function() {
  const element = $(this).get(0);
  if (!element) {
    return;
  }
  return element.scrollHeight - element.clientHeight;
};

$.fn.scrollToBottom = function() {
  const $element = $(this);
  if ($element.length === 0) {
    return;
  }
  $element.scrollTop($element[0].scrollHeight);
  return window.setTimeout(() => {
    if (!$(this).isScrolledBottom()) {
      return $element.scrollTop($element[0].scrollHeight);
    }
  }, 200);
};

$.fn.scrollBy = function(distance) {
  const $element = $(this);
  if ($element.length === 0) {
    return;
  }
  const scrollTop = $element[0].scrollTop;
  return $element.scrollTop(scrollTop + distance);
};

$.fn.isScrolledBottom = function(offset) {
  if (offset == null) {
    offset = 0;
  }
  const $element = $(this);
  if ($element.length === 0) {
    return;
  }
  const scrollTop = Math.ceil($element.scrollTop());
  const scrollHeight = $element[0].scrollHeight;
  const height = $element[0].clientHeight;
  return scrollTop + height + offset >= scrollHeight;
};

$.fn.isScrolledTop = function() {
  const $element = $(this);
  if ($element.length === 0) {
    return;
  }
  return $element.scrollTop() === 0;
};

$.fn.isScrollable = function() {
  const element = $(this).get(0);
  if (!element) {
    return;
  }
  return element.scrollHeight > element.clientHeight;
};
