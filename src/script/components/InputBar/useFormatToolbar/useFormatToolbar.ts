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

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {StorageKey} from 'Repositories/storage';
import {EventName} from 'Repositories/tracking/EventName';
import {Config} from 'src/script/Config';
import {loadValue, storeValue} from 'Util/StorageUtil';

export const useFormatToolbar = () => {
  const [open, setOpen] = useState(() => {
    const messageFormatButtonsEnabled = Config.getConfig().FEATURE.ENABLE_MESSAGE_FORMAT_BUTTONS;
    const storageValue = loadValue<boolean>(StorageKey.INPUT.SHOW_FORMATTING);

    if (storageValue && messageFormatButtonsEnabled) {
      return storageValue;
    }

    return false;
  });

  const handleClick = () => {
    const nextValue = !open;
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.INPUT.FORMAT_TEXT[nextValue ? 'ENABLED' : 'DISABLED']);
    storeValue(StorageKey.INPUT.SHOW_FORMATTING, nextValue);
    setOpen(nextValue);
  };

  return {
    open,
    handleClick,
  };
};
