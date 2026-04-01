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

import {Maybe} from 'true-myth';

import {t} from 'Util/localizerUtil';
import {isAxiosError} from 'Util/typePredicateUtil';

export const ITEM_ALREADY_EXISTS_ERROR = 409;

export const getNameValidationError = (name: string): string | null => {
  if (!name) {
    return t('cells.newItemMenuModalForm.nameRequired');
  }

  return null;
};

export const getErrorStatus = (error: unknown): number | undefined => {
  return Maybe.of(error)
    .andThen(caughtError => {
      if (!isAxiosError(caughtError)) {
        return Maybe.nothing();
      }

      return Maybe.of(caughtError.response?.status);
    })
    .unwrapOr(undefined);
};
