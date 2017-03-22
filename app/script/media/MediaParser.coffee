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
z.media ?= {}

# Media Parser to render rich media embeds.
class MediaParser
  # Construct a new Media parser and select available embeds.
  constructor: ->
    @embeds = [
      z.media.MediaEmbeds.soundcloud
      z.media.MediaEmbeds.spotify
      z.media.MediaEmbeds.vimeo
      z.media.MediaEmbeds.youtube
    ]

  ###
  Render media embeds.

  @note Checks message for valid media links and appends an iFrame right after the link

  @param message [String] Message text
  @param theme_color [String] Accent color to be applied to the embed
  ###
  render_media_embeds: (message, theme_color) =>
    div = document.createElement 'div'
    div.innerHTML = message
    links = div.querySelectorAll 'a'

    for link in links
      for embed in @embeds
        message = embed link, message, theme_color

    return message

z.media.MediaParser = new MediaParser()
