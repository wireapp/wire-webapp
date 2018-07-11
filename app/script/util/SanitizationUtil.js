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

'use strict';

window.z = window.z || {};
window.z.util = z.util || {};

z.util.SanitizationUtil = (() => {
  const _escapeRegex = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const _escapeString = string => _.escape(string);

  const _getEscapedFirstName = (userEntity, declension) => {
    return userEntity.is_me ? _getSelfName(declension) : _escapeString(userEntity.first_name());
  };

  const _getEscapedSelfName = (declension = z.string.Declension.NOMINATIVE) => {
    const selfNameDeclensions = {
      [z.string.Declension.NOMINATIVE]: z.string.conversationYouNominative,
      [z.string.Declension.DATIVE]: z.string.conversationYouDative,
      [z.string.Declension.ACCUSATIVE]: z.string.conversationYouAccusative,
    };

    return _escapeString(z.l10n.text(selfNameDeclensions[declension]));
  };

  return {
    escapeRegex: _escapeRegex,
    escapeString: _escapeString,
    getEscapedFirstName: _getEscapedFirstName,
    getEscapedSelfName: _getEscapedSelfName,
  };
})();
