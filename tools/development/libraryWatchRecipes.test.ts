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

import {developmentLibraries, getSelectedLibraryWatchRecipes} from './libraryWatchRecipes';

describe('getSelectedLibraryWatchRecipes', () => {
  it('returns only selected watch recipes and keeps the existing defaults', () => {
    const actualRecipes = getSelectedLibraryWatchRecipes({
      libraryRecipeNames: ['watch-library-api-client', 'watch-library-telemetry'],
    });
    const defaultSelections = developmentLibraries
      .filter((library): boolean => {
        return library.checked === true;
      })
      .map((library): string => {
        return library.value;
      });

    expect(actualRecipes).toEqual(['watch-library-api-client', 'watch-library-telemetry']);
    expect(defaultSelections).toEqual(['watch-library-react-ui-kit', 'watch-library-api-client']);
  });

  it('rejects unknown library recipes', () => {
    expect(() => {
      getSelectedLibraryWatchRecipes({libraryRecipeNames: ['watch-library-missing']});
    }).toThrow('Unknown development library selection: watch-library-missing');
  });
});
