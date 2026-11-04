/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {developmentLibraries, getSelectedLibraryWatchCommands} from './libraryWatchRecipes';

describe('getSelectedLibraryWatchCommands', () => {
  it('returns commands for selected libraries and keeps the existing defaults', () => {
    const actualCommands = getSelectedLibraryWatchCommands({
      libraryNames: ['api-client', 'telemetry'],
    });
    const defaultSelections = developmentLibraries
      .filter((library): boolean => {
        return library.checked === true;
      })
      .map((library): string => {
        return library.value;
      });

    expect(actualCommands).toEqual(['just watch-library api-client', 'just watch-library-telemetry']);
    expect(defaultSelections).toEqual(['react-ui-kit', 'api-client']);
  });

  it('rejects unknown library names', () => {
    expect(() => {
      getSelectedLibraryWatchCommands({libraryNames: ['missing']});
    }).toThrow('Unknown development library selection: missing');
  });
});
