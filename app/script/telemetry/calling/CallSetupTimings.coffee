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
z.telemetry ?= {}
z.telemetry.calling ?= {}

class z.telemetry.calling.CallSetupTimings
  constructor: (@call_id) ->
    @logger = new z.util.Logger 'z.telemetry.calling.CallSetupTimings', z.config.LOGGER.OPTIONS
    @is_answer = false
    @flow_id = undefined

    @started = window.performance.now()
    @stream_requested = 0
    @stream_received = 0
    @state_put = 0
    @flow_received = 0
    @peer_connection_created = 0
    @remote_sdp_received = 0
    @remote_sdp_set = 0
    @local_sdp_created = 0
    @local_sdp_send = 0
    @local_sdp_set = 0
    @ice_gathering_started = 0
    @ice_gathering_completed = 0
    @ice_connection_checking = 0
    @ice_connection_connected = 0
    @ice_connection_completed = 0

  get: =>
    timings = {}
    for step in @_steps_order()
      timings[step] = @[step]
    return timings

  time_step: (step) ->
    if @[step] is 0
      @[step] = window.parseInt window.performance.now() - @started

  log: =>
    @logger.info "Call setup duration for flow ID '#{@flow_id}' of call ID '#{@call_id}'"
    for step in @_steps_order()
      placeholder_key = Array(Math.max 26 - step.length, 1).join ' '
      placeholder_value = Array(Math.max 6 - @[step].toString().length, 1).join ' '
      @logger.info "Step#{placeholder_key}'#{step}':#{placeholder_value}#{@[step]}ms"

  _steps_order: ->
    if @is_answer
      return z.telemetry.calling.CallSetupStepsOrder.ANSWER
    return z.telemetry.calling.CallSetupStepsOrder.OFFER
