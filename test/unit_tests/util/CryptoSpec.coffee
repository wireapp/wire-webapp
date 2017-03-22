#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

# grunt test_init && grunt test_run:util/Crypto

describe 'z.util.Crypto', ->
  describe 'Jenkins’s one-at-a-time hash', ->
    sample =
      '25f79335-6a5b-410e-90ea-653bd18b66da': 348398396
      'b88a6d46-b2ae-4122-8022-d6ed66a25f09': 1021700091
      'e50759ee-d32b-438f-bdbd-2605f48773e6': 1241303210
      '3dcdf935-d346-48cc-bdeb-fd9369192fec': 1413083903
      '9c102a7a-349f-4466-bdc0-5d8640023187': 1625780665
      'b413f30c-2aed-42d6-b882-328036d4247e': 2188977546
      '62e52f9e-0a69-49eb-9a02-b89e440f8950': 3345908844
      'fb303c6d-aa88-4ddc-81c1-fc51e5fc0ed8': 3615181544
      '17fa9af0-5e83-4b10-a3e6-0059591fabea': 3869474815
      'e1b6e9f0-aafd-4ba9-8030-6dd053531afd': 4118671235

    it 'can calculate Jenkins’s one-at-a-time hash for a User ID', ->
      user_id = '532af01e-1e24-4366-aacf-33b67d4ee376'

      actual = z.util.Crypto.Hashing.joaat_hash user_id
      expected = window.parseInt '200a4836', 16

      expect(actual).toBe expected

    it 'returns the expected hash values for some test strings', ->
      key = '25f79335-6a5b-410e-90ea-653bd18b66da'
      actual = z.util.Crypto.Hashing.joaat_hash key
      expect(actual).toEqual sample[key]

      key = 'b88a6d46-b2ae-4122-8022-d6ed66a25f09'
      actual = z.util.Crypto.Hashing.joaat_hash key
      expect(actual).toEqual sample[key]

      key = 'e50759ee-d32b-438f-bdbd-2605f48773e6'
      actual = z.util.Crypto.Hashing.joaat_hash key
      expect(actual).toEqual sample[key]

      key = 'e1b6e9f0-aafd-4ba9-8030-6dd053531afd'
      actual = z.util.Crypto.Hashing.joaat_hash key
      expect(actual).toEqual sample[key]

    it 'returns zero for an empty string', ->
      actual = z.util.Crypto.Hashing.joaat_hash ''
      expect(actual).toEqual 0

    it 'returns the same value for upper and lowercase strings', ->
      key = 'E1b6e9f0-aafd-4ba9-8030-6Dd053531afd'
      actual = z.util.Crypto.Hashing.joaat_hash key
      expect(actual).toEqual sample[key.toLowerCase()]
