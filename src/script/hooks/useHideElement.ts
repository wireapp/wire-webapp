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

import {KEY} from 'Util/KeyboardUtil';
import {useDisposableRef} from 'Util/useDisposableRef';

const hideControlsClass = 'hide-controls';

const useHideElement = (timeout: number, skipClass?: string) => {
  return useDisposableRef(element => {
    let hideTimeout: number;

    const hideElement = () => element.classList.add(hideControlsClass);

    const startTimer = () => {
      hideTimeout = window.setTimeout(hideElement, timeout);
    };

    const resetTimer = (target: Element) => {
      window.clearTimeout(hideTimeout);
      element.classList.remove(hideControlsClass);

      if (skipClass) {
        const closest = (target as Element).closest(`.${skipClass}`);
        if (element.contains(closest)) {
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

    element.addEventListener('mouseleave', hideElement);
    element.addEventListener('mouseout', hideElement);
    element.addEventListener('mousemove', onMouseMove);
    element.addEventListener('keydown', onKeyDown);

    startTimer();
    return () => {
      window.clearTimeout(hideTimeout);
      element.removeEventListener('mouseleave', hideElement);
      element.removeEventListener('mouseout', hideElement);
      element.removeEventListener('mousemove', onMouseMove);
      element.removeEventListener('keydown', onKeyDown);
      element.classList.remove(hideControlsClass);
    };
  });
};

export default useHideElement;
