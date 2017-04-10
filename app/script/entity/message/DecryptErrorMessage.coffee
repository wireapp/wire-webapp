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
z.entity ?= {}

class z.entity.DecryptErrorMessage extends z.entity.Message
  constructor: ->
    super()
    @super_type = z.message.SuperType.UNABLE_TO_DECRYPT

    @error_code = ''
    @client_id = ''

    @caption = ko.pureComputed =>
      caption_id = z.string.conversation_unable_to_decrypt_1
      caption_id = z.string.conversation_unable_to_decrypt_2 if @error_code is Proteus.errors.DecodeError.CODE.CASE_204
      return z.localization.Localizer.get_text
        id: caption_id
        replace:
          placeholder: '%@name', content: "<span class='label-bold-xs'>#{ z.util.escape_html @user().first_name()}</span>"

    @link = ko.pureComputed =>
      return z.localization.Localizer.get_text z.string.url_decrypt_error_2 if @error_code is Proteus.errors.DecodeError.CODE.CASE_204
      return z.localization.Localizer.get_text z.string.url_decrypt_error_1

    @is_recoverable = ko.pureComputed =>
      return @error_code.toString().startsWith '2'

    @is_resetting_session = ko.observable false

    @error_message = ko.pureComputed =>
      parts = []

      if @error_code
        error_text = z.localization.Localizer.get_text z.string.conversation_unable_to_decrypt_error_message
        parts.push "#{error_text}: <span class='label-bold-xs'>#{@error_code}</span>"

      if @client_id
        parts.push "ID: #{z.util.print_devices_id(@client_id)}"

      return "(#{parts.join(' ')})" if parts.length
