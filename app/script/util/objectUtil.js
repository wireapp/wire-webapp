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

import {isObject, isArray} from 'underscore';

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

/**
 * Deep merges two high end entities together (containing observables)
 * This will allow fine grained change detection on the observable level.
 *
 * @param {Entity} destination - the object that will receive the properties from the source object
 * @param {Entity} source - the entity containing the data that will be fed to the destination
 * @param {string[]} ignoredProperties - list of properties that should be left untouched from the destination entity
 * @returns {Entity} mergedEntity
 */
export const mergeEntities = (destination, source, ignoredProperties = []) => {
  if (!isObject(source) || !isObject(destination)) {
    return source;
  }
  if (isArray(source)) {
    destination.length = source.length;
    source.forEach((value, index) => {
      destination[index] = mergeEntities(destination[index], value, ignoredProperties);
    });
    return destination;
  }
  const properties = Object.entries(source).filter(([property]) => !ignoredProperties.includes(property));
  const rawValues = properties.filter(([_, accessor]) => {
    return typeof accessor !== 'function';
  });

  const deletedProperties = Object.keys(destination).filter(property => !source.hasOwnProperty(property));

  const observableValues = properties.filter(([_, accessor]) => {
    return ko.isObservable(accessor) && !ko.isComputed(accessor) && !ko.isPureComputed(accessor);
  });

  // update raw values first (in order to have them up to date when observables are updated)
  rawValues.forEach(
    ([property, value]) => (destination[property] = mergeEntities(destination[property], value, ignoredProperties))
  );
  deletedProperties.forEach(property => delete destination[property]);
  observableValues.forEach(([property, value]) => {
    destination[property](mergeEntities(ko.unwrap(destination[property]), ko.unwrap(value), ignoredProperties));
  });

  return destination;
};
