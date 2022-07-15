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

import {useEffect} from 'react';

import {KEY} from 'Util/KeyboardUtil';
import useEffectRef from 'Util/useEffectRef';

const hideControlsClass = 'hide-controls';

const useHideElement = (timeout: number, skipClass?: string) => {
  const [ref, setRef] = useEffectRef<HTMLDivElement>();

  useEffect(() => {
    if (!ref) {
      return undefined;
    }

    let hideTimeout: number;

    const hideElement = () => ref.classList.add(hideControlsClass);

    const startTimer = () => {
      hideTimeout = window.setTimeout(hideElement, timeout);
    };

    const resetTimer = (target: Element) => {
      window.clearTimeout(hideTimeout);
      ref.classList.remove(hideControlsClass);

      if (skipClass) {
        const closest = (target as Element).closest(`.${skipClass}`);
        if (ref.contains(closest)) {
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

    ref.addEventListener('mouseleave', hideElement);
    ref.addEventListener('mouseout', hideElement);
    ref.addEventListener('mousemove', onMouseMove);
    ref.addEventListener('keydown', onKeyDown);

    startTimer();
    return () => {
      window.clearTimeout(hideTimeout);
      ref.removeEventListener('mouseleave', hideElement);
      ref.removeEventListener('mouseout', hideElement);
      ref.removeEventListener('mousemove', onMouseMove);
      ref.removeEventListener('keydown', onKeyDown);
      ref.classList.remove(hideControlsClass);
    };
  }, [ref, skipClass, timeout]);

  return setRef;
};

export default useHideElement;
