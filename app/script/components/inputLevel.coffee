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

class z.components.InputLevel
  constructor: (params) ->
    @input_level = params.level

    @level_in_view = ko.pureComputed =>
      return @input_level()
    .extend rateLimit: 100

    @bullet_count = [0..19]

  is_bullet_active: (index) =>
    threshold_passed = @level_in_view() > (index + 1) / @bullet_count.length
    return 'input-level-bullet-active' if threshold_passed

ko.components.register 'input-level',
  viewModel: z.components.InputLevel
  template: """
            <ul class="input-level">
              <!-- ko foreach: bullet_count -->
               <li class="input-level-bullet" data-bind="css: $parent.is_bullet_active($data)"></li>
              <!-- /ko -->
            </ul>
            """
