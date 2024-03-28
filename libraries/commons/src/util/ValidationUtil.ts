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

export const PATTERN = {
  EMAIL:
    '(([^<>\\(\\)\\[\\]\\\\.,;:\\s@"]+(\\.[^<>\\(\\)\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))',
  UUID_V4: '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',
};

export function isUUIDv4(candidate: string): boolean {
  const uuidv4Regex = new RegExp(`^${PATTERN.UUID_V4}$`, 'i');
  return uuidv4Regex.test(candidate);
}

export function isValidEmail(email: string): boolean {
  const regExp = new RegExp(`^${PATTERN.EMAIL}$`, 'i');
  return regExp.test(email);
}

export function isValidHandle(handle: string): boolean {
  return /^[a-z_0-9.-]{2,256}$/.test(handle);
}

export const DEFAULT_PASSWORD_MIN_LENGTH = 8;
export const DEFAULT_PASSWORD_MAX_LENGTH = 120;

export function getNewPasswordPattern(
  minLength = DEFAULT_PASSWORD_MIN_LENGTH,
  maxLength = DEFAULT_PASSWORD_MAX_LENGTH,
): string {
  return `(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[^0-9a-zA-Z]).{${minLength},${maxLength}}$`;
}
