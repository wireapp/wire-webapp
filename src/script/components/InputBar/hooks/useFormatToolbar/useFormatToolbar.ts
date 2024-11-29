/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useState} from 'react';

import {StorageKey} from 'src/script/storage';
import {loadValue, storeValue} from 'Util/StorageUtil';

export const useFormatToolbar = () => {
  const [open, setOpen] = useState(() => {
    return loadValue<boolean>(StorageKey.INPUT.SHOW_FORMATTING) ?? false;
  });

  const handleClick = () => {
    storeValue(StorageKey.INPUT.SHOW_FORMATTING, !open);
    setOpen(prev => !prev);
  };

  return {
    open,
    handleClick,
  };
};
