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

###
     Encoding
     =========

     The initial data is:
     +-----------------------+--------------+--------------------------+
     | 14 bytes random data  | 2 bytes time | 16 bytes UUID            |
     +-----------------------+--------------+--------------------------+

     The initial data is then encoded with AES, no IV, no padding.

     Time is the number of hours since 01 Jan 2014 00:00 as a Big Endian unsigned int16.
###

z.util.Invite = do ->

  RANDOM_DATA_SIZE = 14
  TIME_DATA_SIZE = 2
  UUID_DATA_SIZE = 16
  BUFFER_SIZE = RANDOM_DATA_SIZE + TIME_DATA_SIZE + UUID_DATA_SIZE

  HOUR_IN_SEC = 60 * 60

  REFERENCE_TIMESTAMP = 1388534400 # 01 Jan 2014 00:00:00

  INVITATION_TO_CONNECT_BASE_URL = 'https://wire.com/c/'
  INVITATION_TO_CONNECT_TTL = 14 # 2 weeks

  # AES
  KEY = new Uint8Array [
    0x64, 0x68, 0xca, 0xee, 0x5c, 0x0, 0x25, 0xf5, 0x68, 0xe4, 0xd0, 0x85, 0xf8, 0x38, 0x28, 0x6a,
    0x8a, 0x98, 0x6d, 0x2d, 0xfa, 0x67, 0x5e, 0x48, 0xa3, 0xed, 0x2a, 0xef, 0xdd, 0xaf, 0xe8, 0xc1
  ]

  ###
  Get difference between date and reference date in hours

  @param date [Date]
  ###
  hours_between_reference_date_and_date: (date) ->
    diff = date.getTime() / 1000 - REFERENCE_TIMESTAMP
    return Math.floor diff / HOUR_IN_SEC

  ###
  Generate invitation token based on user id and expiration date

  @param user_id [String]
  @param expiration_date [Date]
  ###
  encode_data: (user_id, expiration_date) ->
    decrypted_data = new Uint8Array BUFFER_SIZE

    # 14 bytes random data
    for i in [0...RANDOM_DATA_SIZE]
      decrypted_data[i] = (Math.random() * 0x100000000) | 0

    # 2 bytes time
    hours = @hours_between_reference_date_and_date expiration_date
    hours_left_byte = hours >>> 8
    hours_right_byte = hours & 255
    decrypted_data.set [hours_left_byte, hours_right_byte], RANDOM_DATA_SIZE
    # 16 bytes UUID
    uuid_bytes = z.util.uuid_to_bytes user_id
    decrypted_data.set uuid_bytes, RANDOM_DATA_SIZE + TIME_DATA_SIZE

    # encrypt without initial vector and padding
    encrypted_data = CryptoJS.AES.encrypt CryptoJS.lib.WordArray.create(decrypted_data), CryptoJS.lib.WordArray.create(KEY),
      iv: new CryptoJS.lib.WordArray.init(),
      padding: CryptoJS.pad.NoPadding

    encrypted_data_base64 = encrypted_data.toString()

    # remove padding and make base64 string url safe
    encrypted_data_base64 = encrypted_data_base64
      .replace /\=$/, ''
      .replace /\//g, '_'
      .replace /\+/g, '-'

    return encrypted_data_base64

  ###
  Extract user id and expiration_date from given invitation token

  @param user_id [String]
  @param expiration_date [Date]
  ###
  decode_data: (data) ->
    # add padding and revert url safe characters
    data = data
      .concat '='
      .replace /_/g, '/'
      .replace /-/g, '+'

    # decrypt
    decrypted_data = CryptoJS.AES.decrypt data, CryptoJS.lib.WordArray.create(KEY),
      iv: new CryptoJS.lib.WordArray.init(),
      padding: CryptoJS.pad.NoPadding

    decrypted_data_bytes =  z.util.base64_to_array decrypted_data.toString(CryptoJS.enc.Base64)

    return if not decrypted_data_bytes

    # no typed array slice in all browsers
    decrypted_data_bytes = Array.prototype.slice.call decrypted_data_bytes

    # decode user id
    uuid_bytes = decrypted_data_bytes.slice 16, decrypted_data_bytes.length
    uuid = z.util.bytes_to_uuid uuid_bytes

    # decode timestamp
    timestamp_bytes = decrypted_data_bytes.slice 14, 16
    timestamp = timestamp_bytes[0] << 8 | timestamp_bytes[1] & 255

    return [uuid, timestamp]

  ###
  Generate invite url for given user id

  @param user_id [String] receiver will be connected with this user
  ###
  get_invitation_to_connect_url: (user_id) ->
    expiration_date = new Date()
    expiration_date.setDate expiration_date.getDate() + INVITATION_TO_CONNECT_TTL
    return INVITATION_TO_CONNECT_BASE_URL + @encode_data user_id, expiration_date

  ###
  Extract user id from invite token. Will return undefined if the token is expired.

  @param token [String] invite to connect token
  ###
  get_user_from_invitation_token: (token) ->
    [uuid, timestamp] = @decode_data token
    current_timestamp = @hours_between_reference_date_and_date new Date()
    is_valid_token = current_timestamp <= timestamp
    return uuid if is_valid_token
    return null

  ###
  Extract user id from invite url. Will return undefined if the token is expired.

  @param url [String] invite to connect url
  ###
  get_user_from_invitation_url: (url) ->
    return @get_user_from_invitation_token url.replace INVITATION_TO_CONNECT_BASE_URL, ''
