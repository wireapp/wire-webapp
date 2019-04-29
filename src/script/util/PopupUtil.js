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

export const getCursorPixelPosition = input => {
  const css = getComputedStyle(input);
  const boundingRectangleInput = input.getBoundingClientRect();
  const mask = document.createElement('div');
  const span = document.createElement('span');
  const text = document.createTextNode(input.value);

  mask.appendChild(text);

  Object.assign(mask.style, {
    color: 'red',
    font: css.font,
    height: css.height,
    left: `${input.clientLeft + boundingRectangleInput.left}px`,
    overflow: 'scroll',
    padding: css.padding,
    position: 'fixed',
    top: `${input.clientTop + boundingRectangleInput.top}px`,
    visibility: 'hidden',
    whiteSpace: 'pre-wrap',
    width: css.width,
  });

  span.innerText = 'I';

  const position = input.selectionStart;
  if (position === input.value.length) {
    mask.appendChild(span);
  } else {
    mask.insertBefore(span, mask.childNodes[0].splitText(position));
  }
  document.body.appendChild(mask);
  span.scrollIntoView();

  const boundingRectangleSpan = span.getBoundingClientRect();

  mask.remove();
  return boundingRectangleSpan;
};
