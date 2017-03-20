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
z.cryptography ?= {}

z.cryptography.CryptographyErrorType =
  DUPLICATE_MESSAGE: '1701'
  INVALID_MESSAGE_SESSION_NOT_MATCHING: '1976'
  INVALID_MESSAGE_SESSION_MISSING: '2237'
  INVALID_SIGNATURE: '8550'
  OUTDATED_MESSAGE: '2521'
  PRE_KEY_NOT_FOUND: '3337'
  REMOTE_IDENTITY_CHANGED: '3690'
  TOO_DISTANT_FUTURE: '1300'
