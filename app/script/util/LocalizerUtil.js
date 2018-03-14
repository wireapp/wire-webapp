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

z.util.LocalizerUtil = {
  joinNames: (userEntities, declension = z.string.Declension.ACCUSATIVE) => {
    const firstNames = userEntities
      .map(userEntity => z.util.get_first_name(userEntity, declension))
      .sort((userNameA, userNameB) => z.util.StringUtil.sortByPriority(userNameA, userNameB));

    const numberOfNames = firstNames.length;
    if (numberOfNames >= 2) {
      const [secondLastName, lastName] = firstNames.splice(firstNames.length - 2, 2);

      const exactlyTwoNames = numberOfNames === 2;
      const additionalNames = exactlyTwoNames
        ? `${secondLastName} ${z.l10n.text(z.string.and)} ${lastName}`
        : `${secondLastName}${z.l10n.text(z.string.enumerationAnd)}${lastName}`;
      firstNames.push(additionalNames);
    }

    return firstNames.join(', ');
  },
};
