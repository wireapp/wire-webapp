/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

const webappTranslations = require('../src/i18n/en-US.json');

/**
 * Determines if a translation key appears to be dynamically generated
 * based on the message descriptor information from formatjs extraction
 */
function isDynamicId(key, value) {
  // If there's no defaultMessage, it's likely a dynamic reference
  if (value.defaultMessage === undefined) {
    return true;
  }

  // Check if the key looks like it came from a variable/object access
  // These patterns indicate dynamic IDs:
  // - Contains bracket notation patterns
  // - Contains common dynamic ID variable names
  const dynamicPatterns = [
    /\[.*\]/, // Contains brackets like [error.label]
    /errorHandler/i, // From errorHandlerStrings[...]
    /validationError/i, // From validationErrorStrings[...]
    /logoutReason/i, // From logoutReasonStrings[...]
    /translatedErrors/i, // From translatedErrors[...]
  ];

  // Check if the description or file path suggests dynamic usage
  const description = value.description || '';
  const file = value.file || '';

  // If the key itself matches dynamic patterns, skip it
  if (dynamicPatterns.some(pattern => pattern.test(key))) {
    return true;
  }

  // If the description or file context suggests dynamic usage, skip it
  if (dynamicPatterns.some(pattern => pattern.test(description) || pattern.test(file))) {
    return true;
  }

  return false;
}

exports.format = function (messages) {
  return Object.entries(messages).reduce(
    (accumulator, [key, value]) => {
      // Skip dynamic IDs - they should be maintained manually
      if (isDynamicId(key, value)) {
        // Keep existing translation if it exists
        return accumulator;
      }

      // Only overwrite if there's a defaultMessage, otherwise keep existing translation
      if (value.defaultMessage !== undefined) {
        return {
          ...accumulator,
          [key]: value.defaultMessage,
        };
      }
      return accumulator;
    },
    {...webappTranslations},
  );
};
