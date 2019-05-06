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

export function scrollEnd(element: HTMLElement): number {
  return element.scrollHeight - element.clientHeight;
}

export function scrollToBottom(element: HTMLElement): number {
  element.scrollTop = element.scrollHeight;
  return window.setTimeout(() => {
    if (!isScrolledBottom(element)) {
      return (element.scrollTop = element.scrollHeight);
    }
    return undefined;
  }, 200);
}

export function isScrolledBottom(element: HTMLElement): boolean {
  const scrollTop = Math.ceil(element.scrollTop);
  const scrollHeight = element.scrollHeight;
  const height = element.clientHeight;
  return scrollTop + height >= scrollHeight;
}

export function isScrolledTop(element: HTMLElement): boolean {
  return element.scrollTop === 0;
}

export function scrollBy(element: HTMLElement, distance: number): void {
  const scrollTop = element.scrollTop;
  element.scrollTop = scrollTop + distance;
}

export function isScrollable(element: HTMLElement): boolean {
  return element.scrollHeight > element.clientHeight;
}
