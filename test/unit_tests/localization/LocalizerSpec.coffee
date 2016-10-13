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

# grunt test_init && grunt test_run:localization/Localizer

describe 'Localizer', ->
  it 'can get localized strings', ->
    text = z.localization.Localizer.get_text z.string.upload_choose

    expect(text).toBe z.string.upload_choose

  it 'can replace line single strings in the localization', ->
    text = z.localization.Localizer.get_text
      id: 'Talk, message, share.'
      replace:
        placeholder: '%nl'
        content: '<br>'

    expect(text).toBe 'Talk, message, share.'

  it 'can replace multiple strings in the localization', ->
    text = z.localization.Localizer.get_text
      id: 'I’m on Wire. Search for %email or visit %url to connect with me.'
      replace: [
        placeholder: '%email'
        content: entities.user.john_doe.email
      ,
        placeholder: '%url'
        content: 'html://LINK'
      ]

    expect(text).toBe 'I’m on Wire. Search for jd@wire.com or visit html://LINK to connect with me.'

  it 'can replace user names in the localization', ->
    text = z.localization.Localizer.get_text
      id: '%@.first_name won’t see you in search results and won’t be able to send you messages.'
      replace:
        placeholder: '%@.first_name'
        content: '<span class=\"user\"></span>'

    expect(text).toBe '<span class="user"></span> won’t see you in search results and won’t be able to send you messages.'
