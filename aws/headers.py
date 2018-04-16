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

import datetime

import config

CSP = {
  'default-src': "'self'",
  'connect-src': [
    "'self'",
    'blob:',
    'data:',
    'https://*.giphy.com',
    'https://apis.google.com',
    'https://www.google.com',
    'https://maps.googleapis.com',
    'https://api.mixpanel.com',
    'https://api.raygun.io',
    'https://*.unsplash.com',
    'https://wire.com',
    'https://*.wire.com',
    'wss://prod-nginz-ssl.wire.com',
    'https://*.zinfra.io',
    'wss://*.zinfra.io',
  ],
  'font-src': [
    "'self'",
    'data:',
  ],
  'frame-src': [
    'https://accounts.google.com',
    'https://*.soundcloud.com',
    'https://*.spotify.com',
    'https://*.vimeo.com',
    'https://*.youtube-nocookie.com',
  ],
  'img-src': [
    "'self'",
    'blob:',
    'data:',
    'https://*.giphy.com',
    'https://1-ps.googleusercontent.com',
    'https://api.mixpanel.com',
    'https://*.wire.com',
    'https://*.cloudfront.net',
    'https://*.zinfra.io',
    'https://csi.gstatic.com',
  ],
  'media-src': [
    "'self'",
    'data:',
    '*',
  ],
  'object-src': [
    "'self'",
    'https://*.youtube-nocookie.com',
    'https://1-ps.googleusercontent.com',
  ],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://apis.google.com',
    'https://api.mixpanel.com',
    'https://api.raygun.io',
    'https://*.wire.com',
    'https://*.zinfra.io',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'https://*.wire.com',
    'https://*.googleusercontent.com',
  ]
}

CSP_VALUES = '; '.join('{} {}'.format(key, ' '.join(value) if type(value) == list else value) for key, value in CSP.items())


def update_headers(response):
  response.headers['Content-Security-Policy'] = CSP_VALUES
  response.headers['Expect-CT'] = 'max-age=0, report-uri="https://wire.report-uri.com/r/d/ct/reportOnly"'
  response.headers['Referrer-Policy'] = 'same-origin'
  response.headers['Server'] = 'Wire'
  response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  response.headers['X-Content-Security-Policy'] = CSP_VALUES
  response.headers['X-Content-Type-Options'] = 'nosniff'
  response.headers['X-DNS-Prefetch-Control'] = 'off'
  response.headers['X-Frame-Options'] = 'deny'
  response.headers['X-Wire-Version'] = config.CURRENT_VERSION_ID
  response.headers['X-XSS-Protection'] = '1; mode=block'

  if response.mimetype in config.EXPIRES_MIMETYPES:
    expiry_time = datetime.datetime.utcnow() + datetime.timedelta(365)
    response.headers['Expires'] = expiry_time.strftime('%a, %d %b %Y %H:%M:%S GMT')

  if response.mimetype in config.NOCACHE_MIMETYPES:
    response.headers['Cache-Control'] = 'no-cache'

  return response
