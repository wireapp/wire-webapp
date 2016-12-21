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

window.z ?= {}
z.ViewModel ?= {}


class z.ViewModel.CallViewModel
  constructor: (element_id, @call_center, @e_call_center, @media_repository) ->
    @calls = @media_repository.stream_handler.calls
    @joined_call = @media_repository.stream_handler.joined_call

    @remote_media_streams = @media_repository.stream_handler.remote_media_streams
    @self_stream_state = @media_repository.stream_handler.self_stream_state
