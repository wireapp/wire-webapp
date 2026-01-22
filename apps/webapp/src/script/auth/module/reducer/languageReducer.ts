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

import {currentLanguage, findLanguage, mapLanguage} from '../../localeConfig';
import {AppActions, LANGUAGE_ACTION} from '../action/creator/';

export interface LanguageState {
  language: string;
}

export const initialLanguageState: LanguageState = {
  language: mapLanguage(currentLanguage()),
};

export function languageReducer(state: LanguageState = initialLanguageState, action: AppActions): LanguageState {
  switch (action.type) {
    case LANGUAGE_ACTION.SWITCH_LANGUAGE_SUCCESS:
      return {
        language: findLanguage(action.payload) || state.language,
      };
    default:
      return state;
  }
}
