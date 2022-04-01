/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {useEffect, useRef} from 'react';
import {KEY} from 'Util/KeyboardUtil';

const hideControlsClass = 'hide-controls';

const useHideElement = (timeout: number, skipClass?: string) => {
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    if (!ref.current) {
      return undefined;
    }

    let hideTimeout: number;

    const hideElement = () => ref.current.classList.add(hideControlsClass);

    const startTimer = () => {
      hideTimeout = window.setTimeout(hideElement, timeout);
    };

    const resetTimer = (target: Element) => {
      window.clearTimeout(hideTimeout);
      ref.current.classList.remove(hideControlsClass);

      if (skipClass) {
        const closest = (target as Element).closest(`.${skipClass}`);
        if (ref.current.contains(closest)) {
          return;
        }
      }

      startTimer();
    };

    const onMouseMove = ({target}: MouseEvent) => {
      resetTimer(target as Element);
    };

    const onKeyDown = ({target, key}: KeyboardEvent) => {
      if (key === KEY.TAB) {
        resetTimer(target as Element);
      }
    };

    ref.current.addEventListener('mouseleave', hideElement);
    ref.current.addEventListener('mouseout', hideElement);
    ref.current.addEventListener('mousemove', onMouseMove);
    ref.current.addEventListener('keydown', onKeyDown);

    startTimer();
    return () => {
      window.clearTimeout(hideTimeout);
      ref.current.removeEventListener('mouseleave', hideElement);
      ref.current.removeEventListener('mouseout', hideElement);
      ref.current.removeEventListener('mousemove', onMouseMove);
      ref.current.removeEventListener('keydown', onKeyDown);
      ref.current.classList.remove(hideControlsClass);
    };
  }, [ref.current]);

  return ref;
};

export default useHideElement;
