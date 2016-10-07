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
z.ViewModel.content ?= {}


z.ViewModel.content.CONTENT_STATE =
  CONVERSATION: 'z.ViewModel.content.CONTENT_STATE.CONVERSATION'
  CONNECTION_REQUESTS: 'z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS'
  PREFERENCES_ABOUT: 'z.ViewModel.content.CONTENT_STATE.PREFERENCES_ABOUT'
  PREFERENCES_ACCOUNT: 'z.ViewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT'
  PREFERENCES_DEVICE_DETAILS: 'z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS'
  PREFERENCES_DEVICES: 'z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES'
  PREFERENCES_OPTIONS: 'z.ViewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS'
  WATERMARK: 'z.ViewModel.content.CONTENT_STATE.WATERMARK'
