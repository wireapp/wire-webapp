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


z.config =
  BROWSER_NOTIFICATION:
    TIMEOUT: 5000
    TITLE_LENGTH: 38
    BODY_LENGTH: 80

  LOGGER:
    OPTIONS:
      name_length: 60
      domains:
        'app.wire.com': -> 0
        'localhost': -> 300
        'wire.ms': -> 300
        'wire-webapp-edge.wire.com': -> 300
        'wire-webapp-staging.wire.com': -> 300
        'zinfra.io': -> 300

  TIME_BETWEEN_PING: 30000

  # number of message that will be pulled
  MESSAGES_FETCH_LIMIT: 30

  # number of users displayed in people you may know
  SUGGESTIONS_FETCH_LIMIT: 30

  # number of top people displayed in the start ui
  TOP_PEOPLE_FETCH_LIMIT: 24

  #Accent color IDs
  ACCENT_ID:
    BLUE: 1
    GREEN: 2
    YELLOW: 3
    RED: 4
    ORANGE: 5
    PINK: 6
    PURPLE: 7

  # Ignored by the emoji lib
  EXCLUDE_EMOJI: [
    '\u2122' # trademark
    '\u00A9' # copyright
    '\u00AE' # registered
  ]

  # Conversation size
  MAXIMUM_CONVERSATION_SIZE: 128

  # self profile image size
  MINIMUM_PROFILE_IMAGE_SIZE:
    WIDTH: 320
    HEIGHT: 320

  # 15 megabyte image upload limit
  MAXIMUM_IMAGE_FILE_SIZE: 15 * 1024 * 1024

  # 25 megabyte upload limit ( minus iv and padding )
  MAXIMUM_ASSET_FILE_SIZE: 25 * 1024 * 1024 - 16 - 16

  # Maximum of parallel uploads
  MAXIMUM_ASSET_UPLOADS: 10

  # Maximum characters per message
  MAXIMUM_MESSAGE_LENGTH: 8000

  SUPPORTED_IMAGE_TYPES: [
    'image/jpg',
    'image/jpeg',
    'image/png',
    'image/bmp'
  ]

  MINIMUM_USERNAME_LENGTH: 2
  MINIMUM_PASSWORD_LENGTH: 8

  # Time until phone code expires
  LOGIN_CODE_EXPIRATION: 10 * 60

  # measured in pixel
  SCROLL_TO_LAST_MESSAGE_THRESHOLD: 100

  # defines if it was a recently viewed conversation (5 min)
  CONVERSATION_ACTIVITY_TIMEOUT: 5 * 60 * 1000

  PROPERTIES_KEY: 'webapp'

  # bigger requests will be split in chunks with a maximum size as defined
  MAXIMUM_USERS_PER_REQUEST: 200

  UNSPLASH_URL: 'https://source.unsplash.com/1200x1200/?landscape'
  ANNOUNCE_URL: 'https://wire.com/api/v1/announce/'
  BOT_URL: 'https://wire.com/api/v1/bot/'
