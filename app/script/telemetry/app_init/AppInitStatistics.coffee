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

window.z ?= {}
z.telemetry ?= {}
z.telemetry.app_init ?= {}

class z.telemetry.app_init.AppInitStatistics
  constructor: ->
    @logger = new z.util.Logger 'z.telemetry.app_init.AppInitStatistics', z.config.LOGGER.OPTIONS

    amplify.subscribe z.event.WebApp.TELEMETRY.BACKEND_REQUESTS, @update_backend_requests

  add: (statistic, value, bucket_size) =>
    if bucket_size and _.isNumber value
      buckets = Math.floor(value / bucket_size) + if value % bucket_size then 1 else 0
      @[statistic] = if value is 0 then 0 else bucket_size * buckets
    else
      @[statistic] = value

  get: =>
    statistics = {}
    statistics[key] = value for key, value of @ when _.isNumber(value) or _.isString value
    return statistics

  log: =>
    @logger.debug 'App initialization statistics'
    for key, value of @ when _.isNumber(value) or _.isString value
      placeholder_key = Array(Math.max 17 - key.length, 1).join ' '
      placeholder_value = Array(Math.max 11 - value.toString().length, 1).join ' '
      @logger.info "#{placeholder_key}'#{key}':#{placeholder_value}#{value}"

  update_backend_requests: (number_of_requests) =>
    @[z.telemetry.app_init.AppInitStatisticsValue.BACKEND_REQUESTS] = number_of_requests
