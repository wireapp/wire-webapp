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
z.telemetry.app_init ?= {}

class z.telemetry.app_init.AppInitTelemetry
  constructor: ->
    @logger = new z.util.Logger 'z.telemetry.app_init.AppInitTelemetry', z.config.LOGGER.OPTIONS
    @timings = new z.telemetry.app_init.AppInitTimings()
    @statistics = new z.telemetry.app_init.AppInitStatistics()

  add_statistic: (statistic, value, bucket_size) =>
    @statistics.add statistic, value, bucket_size

  get_statistics: =>
    @statistics.get()

  get_timings: =>
    @timings.get()

  log_statistics: =>
    @statistics.log()

  log_timings: =>
    @timings.log()

  report: =>
    statistics = @get_statistics()
    statistics.loading_time = @timings.get_app_load()
    statistics.app_version = z.util.Environment.version false
    @logger.debug 'App initialization telemetry'
    @logger.info "App version '#{statistics.app_version}' initialized within #{statistics.loading_time}s"
    @log_statistics()
    @log_timings()

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.TELEMETRY.APP_INITIALIZATION, statistics

  time_step: (step) =>
    @timings.time_step step
