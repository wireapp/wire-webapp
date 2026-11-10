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

import {isValidCellsNodeName} from './cellsNodeNameValidator';

describe('isValidCellsNodeName', () => {
  it.each(['report/name', 'report\\name', 'report"name'])('rejects names containing %s', name => {
    expect(isValidCellsNodeName(name)).toBe(false);
  });

  it.each(['.', '.hidden'])('rejects names starting with a dot: %s', name => {
    expect(isValidCellsNodeName(name)).toBe(false);
  });

  it.each(['report', 'file.txt', 'my.folder', 'v1.2.report'])('allows %s', name => {
    expect(isValidCellsNodeName(name)).toBe(true);
  });
});
