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
z.components ?= {}

class z.components.EphemeralTimer
  constructor: (params) ->
    scheduled_time = new Date(params.expires()).getTime()
    starting_time = Date.now()
    timer = scheduled_time - starting_time
    update_interval = 1000 / 10

    @progress = ko.observable 0

    @interval_id = window.setInterval =>
      if Date.now() >= scheduled_time
        window.clearInterval @interval_id
      else
        elapsed_time = timer - (scheduled_time - Date.now())
        @progress elapsed_time / timer
    , update_interval

    @bullet_count = [0..4]

  is_bullet_active: (index) =>
    passed_index = @progress() > (index + 1) / @bullet_count.length
    return 'ephemeral-timer-bullet-inactive' if passed_index

  destroy: =>
    window.clearInterval @interval_id

ko.components.register 'ephemeral-timer',
  viewModel: z.components.EphemeralTimer
  template: """
            <ul class="ephemeral-timer">
              <!-- ko foreach : bullet_count -->
               <li class="ephemeral-timer-bullet" data-bind="css: $parent.is_bullet_active($data)"></li>
              <!-- /ko -->
            </ul>
            """
