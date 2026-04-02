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
export const NODE_NAME_MAX_LENGTH = 64;

const INVALID_NODE_NAME_PATTERN = /[\\/"]/u;

export const getNameValidationError = (name: string): Maybe<string> => {
  if (!name) {
    return Maybe.just(t('cells.newItemMenuModalForm.nameRequired'));
  }

  return Maybe.nothing();
};

export const getClientSideNodeNameError = (name: string): Maybe<string> => {
  const requiredNameError = getNameValidationError(name);
  if (requiredNameError.isJust) {
    return requiredNameError;
  }

  if (name.length > NODE_NAME_MAX_LENGTH) {
    return Maybe.just(t('cells.newItemMenuModalForm.maxLengthError'));
  }

  if (name.startsWith('.') || INVALID_NODE_NAME_PATTERN.test(name)) {
    return Maybe.just(t('cells.newItemMenuModalForm.invalidCharactersError'));
  }

  return Maybe.nothing();
};

export const isClientSideNodeNameError = (error: string | null): Maybe<boolean> => {
  const clientSideNameErrors = new Set([
    t('cells.newItemMenuModalForm.nameRequired'),
    t('cells.newItemMenuModalForm.maxLengthError'),
    t('cells.newItemMenuModalForm.invalidCharactersError'),
  ]);

  return Maybe.of(error).map(errorMessage => clientSideNameErrors.has(errorMessage));
};

export const getErrorStatus = (error: unknown): Maybe<number> => {
  return Maybe.of(error).andThen(caughtError => {
    if (!isAxiosError(caughtError)) {
      return Maybe.nothing();
    }

    return Maybe.of(caughtError.response?.status);
  });
};
