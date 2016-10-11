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

ko.bindingHandlers.switch_background = do ->

  # next background image element that will be displayed
  next_image = undefined

  # url of the current background
  current_image_url = undefined

  animation = (last, next) ->
    window.requestAnimationFrame ->
      next
        .css 'opacity': '1'
        .one z.util.alias.animationend, last.remove

  update: (element, valueAccessor) ->
    user_image = ko.unwrap valueAccessor()

    return if not user_image? or user_image is current_image_url

    background_images = $(element).find('.background')

    # clean up background images
    if background_images.length > 1
      background_images.slice(0, -1).remove()

    background_last = background_images.last()
    background_next = background_last.clone()
    background_next.css 'opacity': '0'
    background_next.insertAfter background_last
    next_image = background_next

    if user_image
      image = new Image()
      image.onload = ->
        # check if it was the last scheduled image
        if next_image is background_next
          current_image_url = user_image
          background_next
            .removeClass 'no-background-image'
            .find '.background-image'
            .css 'background-image': user_image
          animation background_last, background_next
        else
          background_next.remove()

      image.src = z.util.strip_url_wrapper user_image
    else
      background_next.addClass 'no-background-image'
      animation background_last, background_next
