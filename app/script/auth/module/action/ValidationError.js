/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

export default class ValidationError extends Error {
  constructor(params) {
    super();
    this.name = this.constructor.name;
    this.label = params.label;
    this.message = params.label;
  }

  is = label => {
    return this.label === label;
  };

  static getAllPropertyNames(obj) {
    let props = [];
    do {
      props = props.concat(Object.getOwnPropertyNames(obj));
    } while ((obj = Object.getPrototypeOf(obj)));
    return props;
  }

  static handleValidationState(fieldName, validationState) {
    const field = ValidationError.getFieldByName(fieldName);
    const validationStateKeys = ValidationError.getAllPropertyNames(validationState);
    const errorKeys = [];
    Object.keys(ValidationError.ERROR).forEach(errorName => errorKeys.push(ValidationError.ERROR[errorName]));
    for (const key of validationStateKeys) {
      if (errorKeys.includes(key) && validationState[key]) {
        return new ValidationError({
          label: field[ValidationError.getErrorByKey(key)],
        });
      }
    }
  }

  static ERROR = {
    PATTERN_MISMATCH: 'patternMismatch',
    RANGE_OVERFLOW: 'rangeOverflow',
    RANGE_UNDERFLOW: 'rangeUnderflow',
    STEP_MISMATCH: 'stepMismatch',
    TOO_LONG: 'tooLong',
    TYPE_MISMATCH: 'typeMismatch',
    VALUE_MISSING: 'valueMissing',
  };

  static getErrorByKey = key => {
    for (const errorName of Object.keys(ValidationError.ERROR)) {
      if (ValidationError.ERROR[errorName] === key) {
        return errorName;
      }
    }
  };

  static mapErrorsToField = fieldName => {
    const errors = {};
    Object.keys(ValidationError.ERROR).forEach(errorKey => {
      errors[errorKey] = `${fieldName}-${ValidationError.ERROR[errorKey]}`;
    });
    return errors;
  };

  static FIELD = {
    EMAIL: {...ValidationError.mapErrorsToField('email'), name: 'email'},
    NAME: {...ValidationError.mapErrorsToField('name'), name: 'name'},
    PASSWORD: {...ValidationError.mapErrorsToField('password'), name: 'password'},
  };

  static getFieldByName(name) {
    for (const fieldKey of Object.keys(ValidationError.FIELD)) {
      const currentField = ValidationError.FIELD[fieldKey];
      if (currentField.name === name) {
        return currentField;
      }
    }
  }
}
