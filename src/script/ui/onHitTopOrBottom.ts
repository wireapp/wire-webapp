/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

const onHitTopOrBottom = (element: HTMLElement | null, onHitTop: () => void, onHitBottom: () => void) => {
  if (!element) {
    return;
  }

  const onScroll = () => {
    const scrollPosition = Math.ceil(element.scrollTop);
    const scrollEnd = element.offsetHeight + scrollPosition;
    const hitTop = scrollPosition <= 0;
    const hitBottom = scrollEnd >= element.scrollHeight;

    if (hitTop) {
      onHitTop();
    } else if (hitBottom) {
      onHitBottom();
    }
  };

  const onMouseWheel = ({currentTarget, deltaY}: WheelEvent) => {
    const element = currentTarget as HTMLElement;
    const isScrollable = element.scrollHeight > element.clientHeight;

    if (isScrollable) {
      // if the element is scrollable, the scroll event will take the relay
      return true;
    }

    const isScrollingUp = deltaY > 0;

    if (isScrollingUp) {
      return onHitTop();
    }

    return onHitBottom();
  };

  element.addEventListener('scroll', onScroll);
  element.addEventListener('wheel', onMouseWheel);
};

export default onHitTopOrBottom;
