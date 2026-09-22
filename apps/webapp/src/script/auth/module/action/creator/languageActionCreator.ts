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

import type {AppAction} from '.';

export enum LANGUAGE_ACTION {
  SWITCH_LANGUAGE_FAILED = 'SWITCH_LANGUAGE_FAILED',
  SWITCH_LANGUAGE_START = 'SWITCH_LANGUAGE_START',
  SWITCH_LANGUAGE_SUCCESS = 'SWITCH_LANGUAGE_SUCCESS',
}

export type LanguageActions = LanguageSwitchStartAction | LanguageSwitchSuccessAction | LanguageSwitchFailedAction;

export interface LanguageSwitchStartAction extends AppAction {
  readonly type: LANGUAGE_ACTION.SWITCH_LANGUAGE_START;
}
export interface LanguageSwitchSuccessAction extends AppAction {
  readonly payload: string;
  readonly type: LANGUAGE_ACTION.SWITCH_LANGUAGE_SUCCESS;
}
export interface LanguageSwitchFailedAction extends AppAction {
  readonly error: Error;
  readonly type: LANGUAGE_ACTION.SWITCH_LANGUAGE_FAILED;
}
