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
# This module of the Wire Software uses software code from Wichita Code
# governed by the MIT license (https://github.com/wichitacode/flask-compress).
#
## The MIT License (MIT)
##
## Copyright (c) 2013 Wichita Code
##
## Permission is hereby granted, free of charge, to any person obtaining a copy
## of this software and associated documentation files (the "Software"), to deal
## in the Software without restriction, including without limitation the rights
## to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
## copies of the Software, and to permit persons to whom the Software is
## furnished to do so, subject to the following conditions:
##
## The above copyright notice and this permission notice shall be included in all
## copies or substantial portions of the Software.
##
## THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
## IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
## FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
## AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
## LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
## OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
## SOFTWARE.

# coding: utf-8

import datetime
import flask
import functools
import gzip
import io

import config
import util


class MyFlask(flask.Flask):
  def process_response(self, response):
    if flask.request.host.startswith('www.'):
      return flask.redirect(flask.request.url.replace('://www.', '://'))
    return gzip_response(update_headers(response))


###############################################################################
# Decorator
###############################################################################
def latest_browser_required(f):
  @functools.wraps(f)
  def decorated_function(*args, **kwargs):
    p = flask.request.path
    browser_check = p.endswith('/') or p.endswith('.html')
    browser_check = browser_check and not p.startswith('/test/')
    if browser_check:
      try:
        agent = util.user_agent()
        if agent['is']['mobile']:
          return flask.abort(406)
        if not util.check_browser(agent):
          return flask.abort(406)
      except KeyError:
        return flask.abort(406)
    return f(*args, **kwargs)
  return decorated_function


###############################################################################
# Headers & security
###############################################################################
def update_headers(response):
  # Security
  response.headers['Strict-Transport-Security'] = 'max-age=26280000'
  response.headers['X-Content-Type-Options'] = 'nosniff'
  response.headers['X-Frame-Options'] = 'deny'
  response.headers['X-XSS-Protection'] = '1; mode=block'

  csp_values = ';'.join([
    # Firefox <35 need this data: attribute for the grayscale filter based on SVG to work https://bugzilla.mozilla.org/show_bug.cgi?id=878608; in newer FF versions we use the new grayscale filter
    "default-src 'self' data:",
    "connect-src 'self' blob: https://*.unsplash.com https://maps.googleapis.com https://*.giphy.com https://api.raygun.io https://www.google.com https://*.wire.com https://wire.com wss://prod-nginz-ssl.wire.com https://*.zinfra.io wss://*.zinfra.io",
    "font-src 'self' data:",
    "frame-src 'self' https://accounts.google.com https://*.youtube.com https://*.soundcloud.com https://*.vimeo.com https://*.spotify.com",
    "img-src 'self' blob: data: filesystem: https://*.giphy.com https://1-ps.googleusercontent.com https://*.localytics.com https://*.wire.com https://*.cloudfront.net https://*.zinfra.io https://csi.gstatic.com",
    # Note: The "blob:" attribute needs to be explicitly set for Chrome 47+: https://code.google.com/p/chromium/issues/detail?id=473904
    "media-src blob: data: *",
    "object-src 'self' https://*.youtube.com 1-ps.googleusercontent.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.localytics.com https://api.raygun.io https://*.wire.com https://*.zinfra.io",
    "style-src 'self' 'unsafe-inline' https://*.wire.com https://*.googleusercontent.com"
  ])
  response.headers['Content-Security-Policy'] = csp_values
  response.headers['X-Content-Security-Policy'] = csp_values

  # Custom headers
  response.headers['X-Wire'] = 'Great Conversations.'
  response.headers['X-Wire-Version'] = config.CURRENT_VERSION_ID

  if response.mimetype in config.EXPIRES_MIMETYPES:
    expiry_time = datetime.datetime.utcnow() + datetime.timedelta(365)
    response.headers['Expires'] = expiry_time.strftime('%a, %d %b %Y %H:%M:%S GMT')

  if response.mimetype in config.NOCACHE_MIMETYPES:
    response.headers['Cache-Control'] = 'no-cache'

  return response


# Taken from https://github.com/wichitacode/flask-compress
def gzip_response(response):
  accept_encoding = flask.request.headers.get('Accept-Encoding', '')

  if (response.mimetype not in config.COMPRESS_MIMETYPES or
      'gzip' not in accept_encoding.lower() or
      not 200 <= response.status_code < 300 or
      (response.content_length is not None and
       response.content_length < config.COMPRESS_MIN_SIZE) or
      'Content-Encoding' in response.headers):
    return response

  response.direct_passthrough = False

  gzip_buffer = io.BytesIO()
  with gzip.GzipFile(
        mode='wb', compresslevel=config.COMPRESS_LEVEL, fileobj=gzip_buffer
      ) as gzip_file:
    gzip_file.write(response.get_data())

  response.set_data(gzip_buffer.getvalue())
  response.headers['Content-Encoding'] = 'gzip'
  response.headers['Content-Length'] = response.content_length

  vary = response.headers.get('Vary')
  if vary:
    if 'accept-encoding' not in vary.lower():
      response.headers['Vary'] = '{}, Accept-Encoding'.format(vary)
  else:
    response.headers['Vary'] = 'Accept-Encoding'

  return response
