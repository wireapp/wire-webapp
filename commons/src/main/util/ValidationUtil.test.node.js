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

const {ValidationUtil} = require('@wireapp/commons');

describe('ValidationUtil', () => {
  describe('"isUUIDv4"', () => {
    it('recognizes correct UUIDv4 strings', () => {
      expect(ValidationUtil.isUUIDv4('22087638-0b00-4e0d-864d-37c08041a2cf')).toBe(true);
      expect(ValidationUtil.isUUIDv4('c45bc829-f028-4550-a66b-1af2b2ac4801')).toBe(true);
      expect(ValidationUtil.isUUIDv4('D45EDF1F-F1D6-4DC9-A560-84F6603A8CED')).toBe(true);
    });

    it('recognizes incorrect UUIDv4 strings', () => {
      expect(ValidationUtil.isUUIDv4('d76259eb-25e1-46d-b170-bfcee91a2733')).toBe(false);
      expect(ValidationUtil.isUUIDv4('d76259eb')).toBe(false);
      expect(ValidationUtil.isUUIDv4('test D45EDF1F-F1D6-4DC9-A560-84F6603A8CED')).toBe(false);
      expect(ValidationUtil.isUUIDv4('0000-D45EDF1F-F1D6-4DC9-A560-84F6603A8CED')).toBe(false);
    });
  });
});
