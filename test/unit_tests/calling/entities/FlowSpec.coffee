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

# grunt test_init && grunt test_run:calling/entities/Flow

describe 'z.calling.entities.Flow', ->

  describe 'it can rewrite an SDP', ->
    flow_et = undefined
    audio_context = undefined

    window.wire =
      auth:
        audio:
          audio_context: undefined

    beforeAll ->
      audio_context = new window.AudioContext()

    beforeEach ->
      conversation_et = new z.entity.Conversation z.util.create_random_uuid()
      user_et = new z.entity.User z.util.create_random_uuid()
      call_et = new z.calling.entities.Call conversation_et, user_et
      remote_participant_et = new z.calling.entities.Participant new z.entity.User z.util.create_random_uuid()
      flow_et = new z.calling.entities.Flow z.util.create_random_uuid(), call_et, remote_participant_et, audio_context
      flow_et.logger.level = z.util.Logger.prototype.levels.ERROR

    afterAll ->
      audio_context.close()

    it 'should properly rewrite the local SDP on affected browsers', ->
      spyOn(flow_et, '_should_rewrite_codecs').and.returnValue true
      local_sdp =  flow_et._rewrite_sdp window.sdp_payloads.original, z.calling.enum.SDPSource.LOCAL
      expect(flow_et._should_rewrite_codecs).toHaveBeenCalled()
      expect(local_sdp.sdp).toEqual window.sdp_payloads.rewritten_codecs.sdp

    it 'should not rewrite the remote SDP on affected browsers', ->
      spyOn(flow_et, '_should_rewrite_codecs').and.returnValue true
      remote_sdp =  flow_et._rewrite_sdp window.sdp_payloads.original, z.calling.enum.SDPSource.REMOTE
      expect(flow_et._should_rewrite_codecs).not.toHaveBeenCalled()
      expect(remote_sdp.sdp).toEqual window.sdp_payloads.original.sdp

    it 'should not rewrite SDP on unaffected browsers', ->
      spyOn(flow_et, '_should_rewrite_codecs').and.returnValue false
      local_sdp =  flow_et._rewrite_sdp window.sdp_payloads.original, z.calling.enum.SDPSource.LOCAL
      expect(flow_et._should_rewrite_codecs).toHaveBeenCalled()
      expect(local_sdp.sdp).toEqual window.sdp_payloads.original.sdp
