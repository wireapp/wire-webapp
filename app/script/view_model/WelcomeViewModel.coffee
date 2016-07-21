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

class z.ViewModel.WelcomeViewModel
  constructor: (element_id, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.WelcomeViewModel', z.config.LOGGER.OPTIONS

    @user = @user_repository.self

    @show_welcome = ko.observable false
    @uploading_image = ko.observable false
    @unsplash_image_loaded = ko.observable false
    @disable_keep_button = ko.computed =>
      @uploading_image() or not @unsplash_image_loaded()

    ko.applyBindings @, document.getElementById element_id

    amplify.subscribe z.event.WebApp.WELCOME.SHOW, => @show_welcome true
    amplify.subscribe z.event.WebApp.WELCOME.UNSPLASH_LOADED, => @unsplash_image_loaded true

  close_welcome: =>
    @show_welcome false
    amplify.publish z.event.WebApp.APP.FADE_IN

    if @user_repository.connections().length is 0
      setTimeout ->
        amplify.publish z.event.WebApp.SEARCH.SHOW
      , 550

  choose_your_own_picture: (files) =>
    return if @uploading_image()

    @uploading_image true
    amplify.publish z.event.WebApp.PROFILE.UPLOAD_PICTURE, files, (response, error) =>
      @uploading_image false
      @close_welcome() if not error
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.ADDED_PHOTO,
        source: 'gallery'
        outcome: if error then 'fail' else 'success'

  keep_this_picture: =>
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.ADDED_PHOTO,
      source: 'unsplash'
      outcome: 'success'
    @close_welcome()
