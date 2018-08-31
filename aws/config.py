#
# Wire
# Copyright (C) 2018 Wire Swiss GmbH
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

# coding: utf-8

import os

ENV = os.environ.get('ENV', 'localhost')
PRODUCTION = ENV != 'localhost'
DEBUG = DEVELOPMENT = not PRODUCTION

SECRET_KEY = os.environ.get('SECRET_KEY', '3.14159265358979323846264338327950')

SUPPORTED = {
  'chrome': 56,
  'firefox': 60,
  'opera': 43,
  'msedge': 15,
}

try:
  with open(os.path.join(os.path.dirname(__file__), 'version')) as f:
    CURRENT_VERSION_ID = f.readline()
except:
  CURRENT_VERSION_ID = 'develop'

CURRENT_VERSION_DATE = CURRENT_VERSION_ID[:10]

COMPRESS_MIMETYPES = [
  'application/json',
  'text/xml',
  'application/javascript',
  'image/svg+xml',
  'text/css',
  'text/html',
  'text/javascript',
]

COMPRESS_MIN_SIZE = 500
COMPRESS_LEVEL = 6

EXPIRES_MIMETYPES = [
  'application/javascript',
  'text/css',
  'text/javascript',
]

NOCACHE_MIMETYPES = [
  'text/html',
]
