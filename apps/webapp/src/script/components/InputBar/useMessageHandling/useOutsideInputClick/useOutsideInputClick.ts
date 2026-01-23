/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {handleClickOutsideOfInputBar} from 'Components/InputBar/util/clickHandlers';

interface UseOutsideInputClickParams {
  isEditing: boolean;
  callback: () => void;
}

export const useOutsideInputClick = ({isEditing, callback}: UseOutsideInputClickParams) => {
  useEffect(() => {
    const onWindowClick = (event: Event): void =>
      handleClickOutsideOfInputBar(event, () => {
        // We want to add a timeout in case the click happens because the user switched conversation and the component is unmounting.
        // In this case we want to keep the edited message for this conversation
        setTimeout(() => {
          callback();
        });
      });
    if (isEditing) {
      window.addEventListener('click', onWindowClick);

      return () => {
        window.removeEventListener('click', onWindowClick);
      };
    }

    return () => undefined;
  }, [callback, isEditing]);
};
