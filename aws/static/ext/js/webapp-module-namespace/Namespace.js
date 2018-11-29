/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

window.Namespace = (function() {
  return function(namespace) {
    var spaces = namespace.split('.');
    var parent = spaces.shift();

    if (!window[parent]) {
      window[parent] = {};
    }

    parent = window[parent];

    for (var i = 0, total = spaces.length; i < total; i++) {
      var space = spaces[i];

      if (!parent[space]) {
        parent[space] = {};
      }

      parent = parent[space];
    }
  };
})();
