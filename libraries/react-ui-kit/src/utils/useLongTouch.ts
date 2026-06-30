/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {useEffect} from 'react';

import {useTimeout} from './useTimeout';

const useLongTouch = (element: HTMLElement | null, onLongTouch: () => void, touchDuration = 800) => {
  const {startTimeout, removeTimeout} = useTimeout(onLongTouch, touchDuration);

  useEffect(() => {
    if (!element) {
      return () => {};
    }

    const onTouchStart = () => {
      startTimeout();
    };

    const onTouchEnd = () => {
      removeTimeout();
    };

    element.addEventListener('touchstart', onTouchStart, false);
    element.addEventListener('touchend', onTouchEnd, false);
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [onLongTouch, touchDuration]);
};

export {useLongTouch};
