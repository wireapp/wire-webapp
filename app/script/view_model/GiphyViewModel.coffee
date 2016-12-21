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

NUMBER_OF_GIFS = 6

STATE =
  DEFAULT: ''
  ERROR: 'error'
  LOADING: 'loading'
  RESULTS: 'results'

class z.ViewModel.GiphyViewModel
  constructor: (@element_id, @conversation_repository, @giphy_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.GiphyViewModel', z.config.LOGGER.OPTIONS

    @modal = undefined
    @state = ko.observable STATE.DEFAULT
    @query = ko.observable ''
    @show_giphy_button  = ko.observable true
    @sending_giphy_message = false

    # gif presented in the single gif view
    @gif = ko.observable()

    # gifs rendered in the modal
    @gifs = ko.observableArray()

    # gif selected by user or single gif when in single gif view
    @selected_gif = ko.observable()

    @_init_subscriptions()

  _init_subscriptions: ->
    amplify.subscribe z.event.WebApp.EXTENSIONS.GIPHY.SHOW, @show_giphy


  show_giphy: =>
    @sending_giphy_message = false
    @query @conversation_repository.active_conversation().input()
    @state STATE.DEFAULT
    @_get_random_gif()
    @modal ?= new zeta.webapp.module.Modal '#giphy-modal'
    @modal.show()


  on_back: =>
    @gifs [@gif()]
    @selected_gif @gif()
    @show_giphy_button true

  on_try_another: =>
    @_get_random_gif()

  on_giphy_button: =>
    @_get_random_gifs()

  on_send: =>
    if @selected_gif() and not @sending_giphy_message
      conversation_et = @conversation_repository.active_conversation()
      @sending_giphy_message = true
      @conversation_repository.send_gif conversation_et, @selected_gif().animated, @query(), ->
        @sending_giphy_message = false
        event = new z.tracking.event.PictureTakenEvent 'conversation', 'giphy', 'button'
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, event.name, event.attributes
        amplify.publish z.event.WebApp.EXTENSIONS.GIPHY.SEND
      @modal.hide()

  on_close: =>
    @modal.hide()

  on_clicked_gif: (clicked_gif, event) =>
    return if  @gifs().length is 1
    gif_item = $(event.currentTarget)
    gif_items = gif_item.parent().children()

    remove_unselected = ->
      $(@).removeClass 'gif-container-item-unselected'

    add_unselected = ->
      $(@).addClass 'gif-container-item-unselected'

    if @selected_gif() is clicked_gif
      gif_items.each remove_unselected
      @selected_gif undefined
    else
      gif_items.each add_unselected
      remove_unselected.apply gif_item
      @selected_gif clicked_gif

  _clear_gifs: =>
    @gifs.removeAll()
    @selected_gif undefined
    @state STATE.LOADING

  _get_random_gif: =>
    return if @state() is STATE.ERROR
    @_clear_gifs()
    @show_giphy_button true

    @giphy_repository.get_random_gif
      tag: @query()
    .then (gif) =>
      @gif gif
      @gifs.push @gif()
      @selected_gif @gif()
      @state STATE.RESULTS
    .catch (error) =>
      @logger.error "No gif found for query: #{@query()}", error
      @state STATE.ERROR

  _get_random_gifs: =>
    return if @state() is STATE.ERROR
    @_clear_gifs()
    @show_giphy_button false

    @giphy_repository.get_gifs
      query: @query()
      number: NUMBER_OF_GIFS
    .then (gifs) =>
      @gifs gifs
      @selected_gif(gifs[0]) if gifs.length is 1
      @state STATE.RESULTS
    .catch (error) =>
      @logger.error "No gifs found for query: #{@query()}", error
      @state STATE.ERROR
