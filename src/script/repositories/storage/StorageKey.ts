/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

export const StorageKey = {
  AUTH: {
    ACCESS_TOKEN: {
      EXPIRATION: 'z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION',
      TTL: 'z.storage.StorageKey.AUTH.ACCESS_TOKEN.TTL',
      TYPE: 'z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE',
      VALUE: 'z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE',
    },
    COOKIE_LABEL: 'z.storage.StorageKey.AUTH.COOKIE_LABEL',
    PERSIST: 'z.storage.StorageKey.AUTH.PERSIST',
    SHOW_LOGIN: 'z.storage.StorageKey.AUTH.SHOW_LOGIN',
  },
  CONVERSATION: {
    EMOJI_USAGE_COUNT: 'z.storage.StorageKey.CONVERSATION.EMOJI_USAGE_COUNT',
    INPUT: 'z.storage.StorageKey.CONVERSATION.INPUT',
  },
  LOCALIZATION: {
    LOCALE: 'z.storage.StorageKey.LOCALIZATION.LOCALE',
  },
  SEARCH: {
    SUGGESTED_SEARCH_ETS: 'z.storage.StorageKey.SEARCH.SUGGESTED_SEARCH_ETS',
  },
  INPUT: {
    SHOW_FORMATTING: 'z.storage.StorageKey.INPUT.SHOW_FORMATTING',
  },
  INITIAL_MAKRETING_CONSENT_ACCEPTED: 'z.storage.StorageKey.INITIAL_MAKRETING_CONSENT_ACCEPTED',
};

export const ROOT_FONT_SIZE_KEY = 'root-font-size';
