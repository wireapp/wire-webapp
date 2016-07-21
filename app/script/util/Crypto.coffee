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

z.util.Crypto = do ->
  Hashing = {}

  # Jenkins's one-at-a-time hash
  Hashing.joaat_hash = (str) ->
    uint32 = window.uint32
    hash = uint32.toUint32 0
    key = str.toLowerCase()

    for i in [0..key.length - 1]
      hash = uint32.addMod32 hash, uint32.toUint32 key.charCodeAt i
      hash = uint32.addMod32 hash, uint32.shiftLeft hash, 10
      hash = uint32.xor hash, uint32.shiftRight hash, 6

    hash = uint32.addMod32 hash, uint32.shiftLeft hash, 3
    hash = uint32.xor hash, uint32.shiftRight hash, 11
    hash = uint32.addMod32 hash, uint32.shiftLeft hash, 15

    return hash

  public_methods =
    Hashing: Hashing

  return public_methods
