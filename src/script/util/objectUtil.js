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

/**
 * Creates an object copy and applies a mapping functions to all properties of that object.
 *
 * @param {Object} object - Base object
 * @param {Function} mappingFunction - Mapping function
 * @returns {Object} Object copy with mapped properties
 */
const mapRecursive = (object, mappingFunction) => {
  if (typeof object !== 'object') {
    return mappingFunction(object);
  }

  const newObject = {};

  Object.entries(object).forEach(([propertyName, value]) => {
    newObject[propertyName] = mapRecursive(value, mappingFunction);
  });

  return newObject;
};

/**
 * Escapes all properties of a given object.
 * @param {Object} object - Base object
 * @returns {Object} Object copy with escaped properties
 */
export const escapeProperties = object => mapRecursive(object, _.escape);
