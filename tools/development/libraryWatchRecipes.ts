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

export type DevelopmentLibrary = {
  readonly name: string;
  readonly value: string;
  readonly checked?: boolean;
};

export const developmentLibraries: readonly DevelopmentLibrary[] = [
  {name: 'react-ui-kit', value: 'watch-library-react-ui-kit', checked: true},
  {name: 'api-client', value: 'watch-library-api-client', checked: true},
  {name: 'core-lib', value: 'watch-library-core'},
  {name: 'commons', value: 'watch-library-commons'},
  {name: 'bazinga64', value: 'watch-library-bazinga64'},
  {name: 'config', value: 'watch-library-config'},
  {name: 'copy-config', value: 'watch-library-copy-config'},
  {name: 'priority-queue', value: 'watch-library-priority-queue'},
  {name: 'store-engine', value: 'watch-library-store-engine'},
  {name: 'store-engine-fs', value: 'watch-library-store-engine-fs'},
  {name: 'store-engine-dexie', value: 'watch-library-store-engine-dexie'},
  {name: 'webapp-events', value: 'watch-library-webapp-events'},
  {name: 'telemetry', value: 'watch-library-telemetry'},
  {name: 'certificate-check', value: 'watch-library-certificate-check'},
  {name: 'license-collector', value: 'watch-library-license-collector'},
];

export type SelectedLibraryWatchRecipesOptions = {
  readonly libraryRecipeNames: readonly string[];
};

export function getSelectedLibraryWatchRecipes(options: SelectedLibraryWatchRecipesOptions): readonly string[] {
  const selectedLibraryRecipeNames = new Set(options.libraryRecipeNames);
  const knownLibraryRecipeNames = new Set(
    developmentLibraries.map((library): string => {
      return library.value;
    }),
  );
  const unknownLibraryRecipeNames = [...selectedLibraryRecipeNames].filter((recipeName): boolean => {
    return knownLibraryRecipeNames.has(recipeName) === false;
  });

  if (unknownLibraryRecipeNames.length > 0) {
    throw new Error(`Unknown development library selection: ${unknownLibraryRecipeNames.join(', ')}`);
  }

  return developmentLibraries
    .filter((library): boolean => {
      return selectedLibraryRecipeNames.has(library.value);
    })
    .map((library): string => {
      return library.value;
    });
}
