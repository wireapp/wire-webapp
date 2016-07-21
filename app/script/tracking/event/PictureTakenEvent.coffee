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
z.tracking ?= {}
z.tracking.event ?= {}

class z.tracking.event.PictureTakenEvent
  # Construct a phone verification event.
  #
  # @param [String] context <conversation|registration|profile">
  # @param [String] source <camera|photoLibrary|giphy|sketch>
  # @param [String] trigger <cli|button>
  #
  constructor: (@context, @source, @trigger) ->
    @name = 'PictureTaken'
    @attributes =
      context: @context
      source: @source
      trigger: @trigger
