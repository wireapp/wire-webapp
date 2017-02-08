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
z.util ?= {}

window.LOG = ->
  console?.log? arguments...


z.util.dummy_image = (width, height) ->
  return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 #{width} #{height}' width='#{width}' height='#{height}'></svg>"


z.util.is_same_location = (past_location, current_location) ->
  return past_location isnt '' and current_location.startsWith past_location


z.util.load_image = (blob) ->
  return new Promise (resolve, reject) ->
    object_url = window.URL.createObjectURL blob
    img = new Image()
    img.onload = ->
      resolve @
      window.URL.revokeObjectURL object_url
    img.onerror = reject
    img.src = object_url


z.util.load_file_buffer = (file) ->
  return new Promise (resolve, reject) ->
    reader = new FileReader()
    reader.onload = -> resolve @result
    reader.onerror = reject
    reader.readAsArrayBuffer file


z.util.load_url_buffer = (url, xhr_accessor_function) ->
  return new Promise (resolve, reject) ->
    xhr = new XMLHttpRequest()
    xhr.open 'GET', url, true
    xhr.responseType = 'arraybuffer'
    xhr.onload = ->
      if xhr.status is 200
        resolve [xhr.response, xhr.getResponseHeader 'content-type']
      else
        reject new Error "Requesting arraybuffer failed with status #{xhr.status}"
    xhr.onerror = reject
    xhr_accessor_function? xhr
    xhr.send()


z.util.load_url_blob = (url) ->
  z.util.load_url_buffer url
  .then (value) ->
    [buffer, type] = value
    return new Blob [new Uint8Array buffer], type: type


z.util.append_url_parameter = (url, parameter) ->
  separator = if z.util.StringUtil.includes url, '?' then '&' else '?'
  return "#{url}#{separator}#{parameter}"


z.util.forward_url_parameter = (url, parameter_name) ->
  parameter_value = z.util.get_url_parameter parameter_name
  if parameter_value?
    return url = z.util.append_url_parameter url, "#{parameter_name}=#{parameter_value}"
  return url


z.util.get_url_parameter = (name) ->
  params = window.location.search.substring(1).split '&'
  for param in params
    value = param.split '='
    if value[0] is name
      if value[1]
        value = unescape value[1]
        return false if value is 'false'
        return true if value is 'true'
        return value
      return true
  return null


###
Get extension of a filename.

@param filename [String] filename including extension
@return [String]
###
z.util.get_file_extension = (filename) ->
  return '' if not filename.includes '.'
  return 'tar.gz' if filename.includes 'tar.gz'
  return filename.substr filename.lastIndexOf('.') + 1

###
Remove extension of a filename.

@param filename [String] filename including extension
@return [String] New String without extension
###
z.util.trim_file_extension = (filename) ->
  filename = filename.replace '.tar.gz', ''
  return filename.replace /\.[^/.]+$/, ''

###
Format bytes into a human readable string.

@param bytes [Number] bytes to format
@param decimals [Number] Number of decimals to keep
@return [String]
###
z.util.format_bytes = (bytes, decimals) ->
  return '0B' if bytes is 0
  kilobytes = 1024
  decimals = decimals + 1 or 2
  unit = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  index = Math.floor Math.log(bytes) / Math.log(kilobytes)
  return parseFloat((bytes / Math.pow(kilobytes, index)).toFixed(decimals)) + unit[index]

###
Format seconds into hh:mm:ss.

@param duration [Number] duration to format in seconds
@return [String]
###
z.util.format_seconds = (duration) ->
  duration = Math.round duration or 0

  hours = Math.floor duration / (60 * 60)
  divisor_for_minutes = duration % (60 * 60)
  minutes = Math.floor divisor_for_minutes / 60
  divisor_for_seconds = divisor_for_minutes % 60
  seconds = Math.ceil divisor_for_seconds

  components = [
    z.util.zero_padding minutes
    z.util.zero_padding seconds
  ]

  if hours > 0
    components.unshift hours

  return components.join ':'

###
Format seconds into 15s, 2m.

@param duration [Number] duration to format in seconds
@return [Array] [number, unit]
###
z.util.format_milliseconds_short = (duration) ->
  seconds = Math.floor duration / 1000
  switch
    when seconds < 60 then [seconds, 's']
    when seconds < 60 * 60 then [Math.floor(seconds / 60), 'm']
    when seconds < 60 * 60 * 24 then [Math.floor(seconds / 60 / 60), 'h']
    else [Math.floor(seconds / 60 / 60 / 24), 'd']


z.util.get_content_type_from_data_url = (data_url) ->
  return data_url.split(',')[0].split(':')[1].split(';')[0]


z.util.strip_data_uri = (string) ->
  return string.replace /^data:.*,/, ''


###
Convert base64 string to UInt8Array.
Function will remove data uri if present

@param base64 [String] base64 encoded string
@return [UInt8Array]
###
z.util.base64_to_array = (base64) ->
  return sodium.from_base64 z.util.strip_data_uri base64

###
Convert ArrayBuffer or UInt8Array to base64 string

@param array [ArrayBuffer|UInt8Array] raw binary data or bytes
@return [String] base64 encoded string
###
z.util.array_to_base64 = (array) ->
  return sodium.to_base64 new Uint8Array(array), true

###
Return base64 encoded md5 of the the given array

@param array [Uint8Array]
@return [String]
###
z.util.array_to_md5_base64 = (array) ->
  word_array = CryptoJS.lib.WordArray.create array
  return CryptoJS.MD5(word_array).toString CryptoJS.enc.Base64

###
Convert base64 dataURI to Blob

@param base64 [String] base64 encoded data uri
@return [Blob]
###
z.util.base64_to_blob = (base64) ->
  mime_type = z.util.get_content_type_from_data_url base64
  bytes = z.util.base64_to_array base64
  return new Blob [bytes], 'type': mime_type

###
Downloads blob using a hidden link element.

@param blob [Blob] Blob to store
@param filename [String] Data will be saved under this name
###
z.util.download_blob = (blob, filename) ->
  url = window.URL.createObjectURL blob
  link = document.createElement 'a'
  document.body.appendChild link
  link.href = url
  link.download = filename
  link.style = 'display: none'
  link.click()

  # Wait before removing resource and link. Needed in FF
  window.setTimeout ->
    document.body.removeChild link
    window.URL.revokeObjectURL url
  , 100


z.util.phone_number_to_e164 = (phone_number, country_code) ->
  return window.PhoneFormat.formatE164 "#{country_code}".toUpperCase(), "#{phone_number}"


z.util.create_random_uuid = ->
  return UUID.genV4().hexString

###
Returns a random integer between min (included) and max (excluded)
###
z.util.get_random_int = (min, max) ->
  min = Math.ceil min
  max = Math.floor max
  return Math.floor Math.random() * (max - min) + min


z.util.encode_base64 = (text) ->
  return window.btoa text


z.util.encode_sha256_base64 = (text) ->
  return CryptoJS.SHA256(text).toString CryptoJS.enc.Base64


z.util.escape_html = (html) ->
  return _.escape html


z.util.alias =
  # Note IE10 listens to "transitionend" instead of "animationend"
  animationend: 'transitionend animationend oAnimationEnd MSAnimationEnd mozAnimationEnd webkitAnimationEnd'


z.util.add_blank_targets = (text_with_anchors) ->
  return "#{text_with_anchors}".replace /rel="nofollow"/gi, 'target="_blank" rel="nofollow noopener noreferrer"'

###
Adds http to given url if protocol missing

@param url [String] URL you want to open in a new browser tab
###
z.util.add_http = (url) ->
  if not url.match /^http[s]?:\/\//i
    url = "http://#{url}"
  return url

###
Opens a new browser tab (target="_blank") with a given URL in a safe environment.

@see https://mathiasbynens.github.io/rel-noopener/
@param url [String] URL you want to open in a new browser tab
###
z.util.safe_window_open = (url, focus = true) ->
  new_window = window.open z.util.add_http url

  if new_window
    new_window.opener = null
    new_window.focus() if focus

  return new_window


z.util.safe_mailto_open = (email) ->
  return if not z.util.is_valid_email email

  new_window = window.open "mailto:#{email}"
  if new_window
    window.setTimeout ->
      new_window.close()
    , 10


z.util.auto_link_emails = (text) ->
  email_pattern = /([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gim
  return text.replace email_pattern, '<a onclick="z.util.safe_mailto_open(\'$1\')" href="#">$1</a>'


z.util.get_last_characters = (message, amount) ->
  return false if message.length < amount
  return message.substring message.length - amount


z.util.cut_last_characters = (message, amount) ->
  return message.substring 0, message.length - amount


z.util.markup_links = (message) ->
  return message.replace(/<a\s+href=/gi, '<a target="_blank" rel="nofollow noopener noreferrer" href=')


# Note: We are using "Underscore.js" to escape HTML in the original message
z.util.render_message = (message) ->
  message = marked message
  message = z.util.auto_link_emails message
  message = message.replace /\n/g, '<br />'
  # Remove <br /> if it is the last thing in a message
  if z.util.get_last_characters(message, '<br />'.length) is '<br />'
    message = z.util.cut_last_characters message, '<br />'.length
  return message


z.util.read_string_chars_as_hex = (text) ->
  text.match(/../g).map (x) ->
    String.fromCharCode window.parseInt x, 16
  .join ''


# append array to knockout observableArray
# source: https://github.com/knockout/knockout/issues/416
z.util.ko_array_push_all = (ko_array, values_to_push) ->
  underlyingArray = ko_array()
  ko_array.valueWillMutate()
  ko.utils.arrayPushAll underlyingArray, values_to_push
  ko_array.valueHasMutated()


# prepend array to knockout observableArray
z.util.ko_array_unshift_all = (ko_array, values_to_shift) ->
  underlyingArray = ko_array()
  ko_array.valueWillMutate()
  Array.prototype.unshift.apply underlyingArray, values_to_shift
  ko_array.valueHasMutated()

# push array deferred to knockout observableArray
z.util.ko_push_deferred = (target, src, number = 100, delay = 300) ->
  interval = window.setInterval ->
    chunk = src.splice 0, number
    z.util.ko_array_push_all target, chunk

    if src.length is 0
      window.clearInterval interval

  , delay

###
Add zero padding until limit is reached

@param value [String|Number]
@return [String]
###
z.util.zero_padding = (value, length = 2) ->
  if value.toString().length < length
    return z.util.zero_padding "0#{value}", length
  return "#{value}"


###
Human readable format of a timestamp. Not testable due to timezones :(
@param timestamp [Number]
@return [String]
###
z.util.format_timestamp = (timestamp, long_format = true) ->
  time = moment timestamp
  format = 'DD.MM.YYYY (HH:mm:ss)'
  if long_format
    format = if moment().year() is time.year() then 'ddd D MMM, HH:mm' else 'ddd D MMM YYYY, HH:mm'

  return time.format format

###
Test whether the given string is ISO 8601 format equally to date.toISOString()

@param date_string [String]
@return [String]
###
z.util.is_iso_string = (date_string) ->
  return /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/.test date_string

z.util.sort_groups_by_last_event = (group_a, group_b) ->
  return group_b.last_event_timestamp() - group_a.last_event_timestamp()

# Returns a copy of an object, which is ordered by the keys of the original object.
z.util.sort_object_by_keys = (object, reverse) ->
  sorted_object = {}

  keys = Object.keys object
  keys.sort()

  if reverse
    for key in keys by -1
      value = object[key]
      sorted_object[key] = value
  else
    for key in keys
      value = object[key]
      sorted_object[key] = value

  return sorted_object


# This will remove url(' and url(" from the beginning of the string.
# It will also remove ") and ') from the end if present.
z.util.strip_url_wrapper = (url) ->
  return url.replace(/^url\(["']?/, '').replace /["']?\)$/, ''

###
Removes protocol, www and trailing slashes in the given url

@param url [String
###
z.util.naked_url = (url = '') ->
  return url
    .toLowerCase()
    .replace /.*?:\/\//, '' # remove protocol
    .replace /\/$/, '' # remove trailing slash
    .replace 'www.', ''


z.util.valid_profile_image_size = (file, min_width, min_height, callback) ->
  image = new Image()
  image.onload = ->
    callback image.width >= min_width and image.height >= min_height
  image.src = window.URL.createObjectURL file


z.util.is_valid_email = (email) ->
  re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test email


###
Checks if input has the format of an international phone number

@note Begins with + and contains only numbers

@param phone_number [String] Input value
@return [Boolean] Is the input a phone number string
###
z.util.is_valid_phone_number = (phone_number) ->
  if z.util.Environment.backend.current is 'production'
    regular_expression = /^\+[1-9]\d{1,14}$/
  else
    regular_expression = /^\+[0-9]\d{1,14}$/
  return regular_expression.test phone_number

z.util.is_valid_username = (username) ->
  username = username.substring 1 if username.startsWith '@'
  return /^[a-z_0-9]{2,21}$/.test username


###
JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)

@param key [String] ASCII only
@param seed [Integer] Positive integer only

@return [Integer] 32-bit positive integer
###
z.util.murmurhash3 = `function(key, seed){
    var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

    remainder = key.length & 3; // key.length % 4
    bytes = key.length - remainder;
    h1 = seed;
    c1 = 0xcc9e2d51;
    c2 = 0x1b873593;
    i = 0;

    while (i < bytes) {
        k1 =
            ((key.charCodeAt(i) & 0xff)) |
            ((key.charCodeAt(++i) & 0xff) << 8) |
            ((key.charCodeAt(++i) & 0xff) << 16) |
            ((key.charCodeAt(++i) & 0xff) << 24);
        ++i;

        k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
        h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    }

    k1 = 0;

    switch (remainder) {
        case 3:
            k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
        case 2:
            k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
        case 1:
            k1 ^= (key.charCodeAt(i) & 0xff);

            k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
            k1 = (k1 << 15) | (k1 >>> 17);
            k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
            h1 ^= k1;
    }

    h1 ^= key.length;

    h1 ^= h1 >>> 16;
    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
}`

z.util.get_unix_timestamp = ->
  return Math.floor Date.now() / 1000


z.util.get_first_name = (user_et, declension = z.string.Declension.NOMINATIVE) ->
  if user_et.is_me
    if declension is z.string.Declension.NOMINATIVE
      return z.localization.Localizer.get_text z.string.conversation_you_nominative
    else if declension is z.string.Declension.DATIVE
      return z.localization.Localizer.get_text z.string.conversation_you_dative
    else if declension is z.string.Declension.ACCUSATIVE
      return z.localization.Localizer.get_text z.string.conversation_you_accusative
  return user_et.first_name()


z.util.print_devices_id = (id) ->
  return '' if not id
  id_with_padding = z.util.zero_padding id, 16
  prettified_id = ''
  prettified_id += "<span class='device-id-part'>#{part}</span>" for part in id_with_padding.match /.{1,2}/g
  return prettified_id

###
Returns bucket for given value based on the specified bucket limits

@example z.util.bucket_values(13, [0, 5, 10, 15, 20, 25]) will return '11-15')

@param value [Number] Numeric value that
@param bucket_limits [Array] Array with numeric values that define the upper limit of the bucket

@return [String] bucket
###
z.util.bucket_values = (value, bucket_limits) ->
  return '0' if value < bucket_limits[0] + 1

  for limit, i in bucket_limits
    if value < limit + 1
      previous_limit = bucket_limits[i - 1]
      return "#{previous_limit + 1}-#{limit}"

  last_limit = bucket_limits[bucket_limits.length - 1]
  return "#{last_limit+1}-"

z.util.format_time_remaining = (time_remaining) ->
  moment_duration = moment.duration time_remaining

  title = ''
  if moment_duration.asHours() is 1
    title += "#{moment_duration.hours()} #{z.localization.Localizer.get_text z.string.ephememal_units_hour}, "
  else if moment_duration.asHours() > 1
    title += "#{moment_duration.hours()} #{z.localization.Localizer.get_text z.string.ephememal_units_hours}, "

  if moment_duration.asMinutes() is 1
    title += "#{moment_duration.minutes()} #{z.localization.Localizer.get_text z.string.ephememal_units_minute} #{z.localization.Localizer.get_text z.string.and} "
  else if moment_duration.asMinutes() > 1
    title += "#{moment_duration.minutes()} #{z.localization.Localizer.get_text z.string.ephememal_units_minutes} #{z.localization.Localizer.get_text z.string.and} "

  if moment_duration.asSeconds() is 1
    title += "#{moment_duration.seconds()} #{z.localization.Localizer.get_text z.string.ephememal_units_second}"
  else if moment_duration.asSeconds() > 1
    title += "#{moment_duration.seconds()} #{z.localization.Localizer.get_text z.string.ephememal_units_seconds}"

  return title or ''

###
Execute provided function on each item of the array with the given interval
@param array [Array]
@param fn [Function]
@param interval [Number] Interval in ms
###
z.util.foreach_deferred = (array, fn, interval) ->
  remaining_items = Array.prototype.slice.apply array
  interval_id = window.setInterval ->
    removed_element = remaining_items.shift()
    if removed_element?
      fn removed_element
    else
      window.clearInterval interval_id
  , interval
