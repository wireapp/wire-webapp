#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
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

# grunt test_init && grunt test_run:calling/mapper/SDPMapper

describe 'z.calling.mapper.SDPMapper', ->
  sdp_mapper = undefined

  beforeAll ->
    sdp_mapper = new z.calling.mapper.SDPMapper()

  describe '_convert_sdp_fingerprint_to_uppercase', ->
    it 'it can convert the SDP fingerprint', ->
      original_sdp_string = window.sdp_payloads.original_fingerprint.sdp
      rewritten_sdp_string = window.sdp_payloads.rewritten_fingerprint.sdp
      mapped_sdp_string = sdp_mapper._convert_sdp_fingerprint_to_uppercase original_sdp_string
      expect(mapped_sdp_string).toEqual rewritten_sdp_string

    it 'does not modify an uppercase fingerprint', ->
      original_sdp_string = window.sdp_payloads.rewritten_fingerprint.sdp
      mapped_sdp_string = sdp_mapper._convert_sdp_fingerprint_to_uppercase original_sdp_string
      expect(mapped_sdp_string).toEqual original_sdp_string
