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
  {name: 'react-ui-kit', value: 'react-ui-kit', checked: true},
  {name: 'api-client', value: 'api-client', checked: true},
  {name: 'core', value: 'core'},
  {name: 'commons', value: 'commons'},
  {name: 'bazinga64', value: 'bazinga64'},
  {name: 'config', value: 'config'},
  {name: 'copy-config', value: 'copy-config'},
  {name: 'priority-queue', value: 'priority-queue'},
  {name: 'store-engine', value: 'store-engine'},
  {name: 'store-engine-fs', value: 'store-engine-fs'},
  {name: 'store-engine-dexie', value: 'store-engine-dexie'},
  {name: 'webapp-events', value: 'webapp-events'},
  {name: 'telemetry', value: 'telemetry'},
  {name: 'certificate-check', value: 'certificate-check'},
  {name: 'license-collector', value: 'license-collector'},
];

export type SelectedLibraryWatchCommandsOptions = {
  readonly libraryNames: readonly string[];
};

export function getSelectedLibraryWatchCommands(options: SelectedLibraryWatchCommandsOptions): readonly string[] {
  const selectedLibraryNames = new Set(options.libraryNames);
  const knownLibraryNames = new Set(
    developmentLibraries.map((library): string => {
      return library.value;
    }),
  );
  const unknownLibraryNames = [...selectedLibraryNames].filter((libraryName): boolean => {
    return knownLibraryNames.has(libraryName) === false;
  });

  if (unknownLibraryNames.length > 0) {
    throw new Error(`Unknown development library selection: ${unknownLibraryNames.join(', ')}`);
  }

  return developmentLibraries
    .filter((library): boolean => {
      return selectedLibraryNames.has(library.value);
    })
    .map((library): string => {
      if (library.value === 'telemetry') {
        return 'just watch-library-telemetry';
      }

      return `just watch-library ${library.value}`;
    });
}
