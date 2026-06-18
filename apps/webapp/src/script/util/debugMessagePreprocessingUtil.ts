/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {getStorage} from 'Util/localStorage';

const DISABLE_MESSAGE_PREPROCESSING_STORAGE_KEY = 'disable-message-preprocessing';

export const DISABLE_MESSAGE_PREPROCESSING_EVENT = 'wire:disable-message-preprocessing-change';

export const isMessagePreprocessingDisabled = (): boolean => {
  return getStorage()?.getItem(DISABLE_MESSAGE_PREPROCESSING_STORAGE_KEY) === 'true';
};

export const setMessagePreprocessingDisabled = (disable: boolean): boolean => {
  getStorage()?.setItem(DISABLE_MESSAGE_PREPROCESSING_STORAGE_KEY, `${disable}`);
  window.dispatchEvent(new CustomEvent(DISABLE_MESSAGE_PREPROCESSING_EVENT, {detail: disable}));
  return disable;
};
