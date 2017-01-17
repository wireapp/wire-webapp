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
z.media ?= {}

# Media embeds.
z.media.MediaEmbeds = do ->

  ###
  Create and iframe.

  @private

  @param options [Object] Settings to be used to create the iframe
  ###
  _create_iframe_container = (options) ->

    defaults =
      allowfullscreen: ' allowfullscreen'
      class: 'iframe-container iframe-container-video'
      frameborder: '0'
      height: '100%'
      type: 'default'
      video: true
      width: '100%'

    opt = _.extend defaults, options

    iframe_container = '<div class="{0}"><iframe class="' + opt.type + '" width="{1}" height="{2}" src="{3}" frameborder="{4}"{5}></iframe></div>'

    if not opt.video
      opt.allowfullscreen = ''
      opt.class = 'iframe-container'

    if z.util.Environment.electron
      opt.allowfullscreen = ''

    return z.util.StringUtil.format iframe_container, opt.class, opt.width, opt.height, opt.src, opt.frameborder, opt.allowfullscreen

  # Enum of different regex for the supported services.
  _regex =
    # example: http://regexr.com/3ase5
    youtube: /.*(?:youtu.be|youtube.com).*(?:\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/g
    soundcloud: /(https?:\/\/(?:www\.|m\.)?)?soundcloud\.com(\/[\w\-]+){2,3}/g
    spotify: /https?:\/\/(?:play\.|open\.)*spotify.com\/([\w\-/]+)/g
    vimeo: /https?:\/\/(?:vimeo\.com\/|player\.vimeo\.com\/)(?:video\/|(?:channels\/staffpicks\/|channels\/)|)((\w|-){7,9})/g

  ###
  Appends and iFrame.

  @private

  @param link [HTMLAnchorElement]
  @param message [String] Message containing the link
  @param iframe [String] HTML of iframe
  ###
  _append_iframe = (link, message, iframe) ->
    link_string = link.outerHTML.replace /&amp;/g, '&'
    message = message.replace link_string, "#{link_string}#{iframe}"

  ###
  Generate embed url to use as src in iframes

  @private

  @param url [String] given youtube url
  ###
  _generate_youtube_embed_url = (url) ->
    if url.match /youtu.be|youtube.com/

      # get youtube video id
      video_id = url.match /(?:embed\/|v=|v\/|be\/)([a-zA-Z0-9_-]{11})/

      return if not video_id

      # we have to remove the v param and convert the timestamp
      # into an embed friendly format (start=seconds)
      query = url
        .substr url.indexOf('?'), url.length
        .replace /^[?]/, '&'
        .replace /[&]v=[a-zA-Z0-9_-]{11}/, ''
        .replace /[&#]t=([a-z0-9]+)/, (a, b) -> "&start=#{_convert_youtube_timestamp_to_seconds b}"
        .replace /[&]?autoplay=1/, '' # remove autoplay param

      # append html5 parameter to youtube src to force html5 mode
      # this fixes the issue that FF displays black box in some cases
      return "https://www.youtube.com/embed/#{video_id[1]}?html5=1#{query}"

  ###
  Converts youtube timestamp into seconds

  @private

  @param timestamp [String] youtube timestamp 1h8m55s
  ###
  _convert_youtube_timestamp_to_seconds = (timestamp) ->
    return 0 if not timestamp
    return window.parseInt(timestamp, 10) if /^[0-9]*$/.test timestamp
    hours = timestamp.match(/([0-9]*)h/)?[1] or 0
    minutes = timestamp.match(/([0-9]*)m/)?[1] or 0
    seconds = timestamp.match(/([0-9]*)s/)?[1] or 0
    return window.parseInt(hours, 10) * 3600 + window.parseInt(minutes, 10) * 60 + window.parseInt(seconds, 10)

  # Make public for testability.
  regex: _regex
  generate_youtube_embed_url: _generate_youtube_embed_url
  convert_youtube_timestamp_to_seconds: _convert_youtube_timestamp_to_seconds

  ###
  Appends SoundCloud iFrame if link is a valid SoundCloud source.

  @param link [HTMLAnchorElement]
  @param message [String] Message containing the link
  ###
  soundcloud: (link, message) ->
    link_src = link.href

    if link_src.match _regex.soundcloud
      link_src = link_src.replace /(m\.)/, ''
      link_path_name = link.pathname

      if link_path_name.endsWith('/')
        link_path_name = link_path_name.substr 0, link_path_name.length - 1

      is_single_track = false
      slashes_in_link = link_path_name.split('/').length

      if slashes_in_link is 3
        is_single_track = true
      else if slashes_in_link > 3 and link_path_name.indexOf('sets') is -1
        # Fix for WEBAPP-1137
        return message

      height = if is_single_track then 164 else 465

      iframe = _create_iframe_container
        src: 'https://w.soundcloud.com/player/?url={1}&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true'
        type: 'soundcloud'
        video: false
        height: height

      embed = z.util.StringUtil.format iframe, height, link_src
      message = _append_iframe link, message, embed

    return message

  ###
  Appends Spotify iFrame if link is a valid Spotify source.

  @param link [HTMLAnchorElement]
  @param message [String] Message containing the link
  ###
  spotify: (link, message) ->
    link_src = link.href

    if link_src.match _regex.spotify

      iframe = _create_iframe_container
        src: 'https://embed.spotify.com/?uri=spotify$1'
        type: 'spotify'
        video: false
        height: '80px'

      # convert spotify uri: album/23... -> album:23... -> album%3A23...
      embed = ''

      link_src.replace _regex.spotify, (match, group1) ->
        replace_slashes = group1.replace /\//g, ':'
        encoded_params = encodeURIComponent ":#{replace_slashes}"
        embed = iframe.replace '$1', encoded_params

      message = _append_iframe link, message, embed

    return message

  ###
  Appends Vimeo iFrame if link is a valid Vimeo source.

  @param link [HTMLAnchorElement]
  @param message [String] Message containing the link
  ###
  vimeo: (link, message, theme_color) ->
    link_src = link.href
    vimeo_color = theme_color?.replace '#', ''

    if link_src.match _regex.vimeo
      return message if z.util.StringUtil.includes link_src, '/user'

      iframe = _create_iframe_container
        src: "https://player.vimeo.com/video/$1?portrait=0&color=#{vimeo_color}&badge=0"
        type: 'vimeo'

      embed = ''

      link_src.replace _regex.vimeo, (match, group1) ->
        embed = iframe.replace '$1', group1

      message = _append_iframe link, message, embed

    return message

  ###
  Appends YouTube iFrame if link is a valid YouTube source.

  @param link [HTMLAnchorElement]
  @param message [String] Message containing the link
  ###
  youtube: (link, message) ->
    embed_url = _generate_youtube_embed_url link.href

    if embed_url

      iframe = _create_iframe_container
        src: embed_url
        type: 'youtube'

      message = _append_iframe link, message, iframe
      return message

    return message
