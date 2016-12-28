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
z.calling ?= {}
z.calling.belfry ?= {}

class z.calling.belfry.CallTrackingInfo
  constructor: (params) ->
    @conversation_id = params.conversation_id
    @session_id = params.session_id
    @time_started = new Date()
    @participants_joined = {}

  add_participant: (participant_et) ->
    @participants_joined[participant_et.user.name()] = true

  to_string: ->
    participants = Object.keys(@participants_joined).join ', '
    return "#{@session_id} in #{@conversation_id} | #{@time_started.toUTCString()} | To: #{participants}"
