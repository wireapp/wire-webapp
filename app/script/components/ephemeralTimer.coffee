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
    message_et = params.message

    @ephemeral_duration = ko.computed => message_et.ephemeral_expires() - message_et.ephemeral_started()

    @progress = ko.observable 0
    @remaining_time = ko.observable 0

    @remaining_subscription = message_et.ephemeral_remaining.subscribe (remaining_time) =>
      if Date.now() >= message_et.ephemeral_expires()
        @progress 1
      else
        elapsed_time = @ephemeral_duration() - remaining_time
        @progress elapsed_time / @ephemeral_duration()

    @bullet_count = [0..4]

  is_bullet_active: (index) =>
    passed_index = @progress() > (index + 1) / @bullet_count.length
    return 'ephemeral-timer-bullet-inactive' if passed_index

  destroy: =>
    @remaining_subscription.dispose()
    window.clearInterval message_et.ephemeral_interval_id
    message_et.ephemeral_interval_id = undefined
    window.clearTimeout message_et.ephemeral_timeout_id
    message_et.ephemeral_timeout_id = undefined

ko.components.register 'ephemeral-timer',
  viewModel: z.components.EphemeralTimer
  template: """
            <ul class="ephemeral-timer">
              <!-- ko foreach: bullet_count -->
               <li class="ephemeral-timer-bullet" data-bind="css: $parent.is_bullet_active($data)"></li>
              <!-- /ko -->
            </ul>
            """
