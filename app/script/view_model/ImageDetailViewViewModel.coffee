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
z.ViewModel ?= {}

class z.ViewModel.ImageDetailViewViewModel
  constructor: (@element_id) ->

    @image_element = undefined
    @button_element = undefined
    @image_modal = undefined

    amplify.subscribe z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW, @show_detail_view

  show_detail_view: (src) =>
    element = $("##{@element_id}")

    @image_element = element.find '.detail-view-image'
    @image_element[0].src = src

    @button_element = element.find '.detail-view-close-button'

    @image_modal.destroy() if @image_modal?
    @image_modal = new zeta.webapp.module.Modal '#detail-view', @_hide_callback, @_before_hide_callback
    @image_modal.show()

    @_show_image()

  hide_detail_view: =>
    @image_modal.hide()

  _before_hide_callback: =>
    @image_element.removeClass 'modal-content-anim-open'

  _hide_callback: =>
    $(window).off 'resize', @_center_image

  _show_image: =>
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.IMAGE_DETAIL_VIEW_OPENED
    setTimeout =>
      @_center_image()
      @image_element
        .addClass 'modal-content-anim-open'
        .one z.util.alias.animationend, => @_check_close_button()
    , 0
    $(window).on 'resize', @_center_image

  _check_close_button: =>
    rect_image = @image_element[0].getBoundingClientRect()
    rect_button = @button_element[0].getBoundingClientRect()
    is_overlapping = rect_button.left < rect_image.right and rect_button.bottom > rect_image.top
    @button_element.toggleClass 'detail-view-close-button-fullscreen', is_overlapping

  _center_image: =>
    @image_element.css
      'margin-left': (window.innerWidth - @image_element.width()) / 2
      'margin-top': (window.innerHeight - @image_element.height()) / 2
