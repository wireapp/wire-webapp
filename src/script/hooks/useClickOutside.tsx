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

import {useEffect, RefObject} from 'react';

export const useClickOutside = (
  ref: RefObject<Element>,
  onClick: (e: MouseEvent) => void,
  exclude?: RefObject<Element>,
  windowDocument = window.document,
) => {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const isOutsideClick = ref.current && ref.current !== event.target && !ref.current.contains(event.target as Node);
      if (isOutsideClick) {
        const isNonExcludedAreaClicked = exclude && exclude.current && !exclude.current.contains(event.target as Node);
        if (isNonExcludedAreaClicked || !exclude) {
          onClick(event);
        }
      }
    };
    windowDocument.addEventListener('click', handleClick);

    return () => windowDocument.removeEventListener('click', handleClick);
  }, [exclude, onClick, ref, windowDocument]);
};
