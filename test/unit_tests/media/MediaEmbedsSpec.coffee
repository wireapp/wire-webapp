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

# grunt test_init && grunt test_run:media/MediaEmbeds

# Will test all common link variations
test_link_variants = (site, re) ->
  expect("http://#{site}.com".match(re)).toBe null
  expect("https://#{site}.com".match(re)).toBe null
  expect("#{site}.com".match(re)).toBe null
  expect("http://m.#{site}.com".match(re)).toBe null
  expect("https://m.#{site}.com".match(re)).toBe null
  expect("m.#{site}.com".match(re)).toBe null
  expect("www.#{site}.com".match(re)).toBe null

# grunt test_init && grunt test_run:media/MediaEmbeds
describe 'MediaEmbeds', ->

  build_message_with_anchor = (link) ->
    return '<a href="' + link + '" target="_blank" rel="nofollow">' + link + '</a>'

  build_youtube_iframe = (link) ->
    embed_url = z.media.MediaEmbeds.generate_youtube_embed_url link
    return '<a href="' + link + '" target="_blank" rel="nofollow">' + link + '</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="' + embed_url + '" frameborder="0" allowfullscreen></iframe></div>'

  build_soundcloud_iframe_for_tracks = (link) ->
    return '<a href="' + link + '" target="_blank" rel="nofollow">' + link + '</a><div class="iframe-container"><iframe class="soundcloud" width="100%" height="164" src="https://w.soundcloud.com/player/?url=' + link + '&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true" frameborder="0"></iframe></div>'

  build_soundcloud_iframe_for_playlists = (link) ->
    return '<a href="' + link + '" target="_blank" rel="nofollow">' + link + '</a><div class="iframe-container"><iframe class="soundcloud" width="100%" height="465" src="https://w.soundcloud.com/player/?url=' + link + '&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true" frameborder="0"></iframe></div>'

  build_spotify_iframe = (link, partial_link) ->
    partial_link = partial_link.replace /\//g, ':'
    return '<a href="' + link + '" target="_blank" rel="nofollow">' + link + '</a><div class="iframe-container"><iframe class="spotify" width="100%" height="80px" src="https://embed.spotify.com/?uri=spotify%3A' + window.encodeURIComponent(partial_link) + '" frameborder="0"></iframe></div>'

  build_vimeo_iframe = (link, id) ->
    return '<a href="' + link + '" target="_blank" rel="nofollow">' + link + '</a><div class="iframe-container iframe-container-video"><iframe class="vimeo" width="100%" height="100%" src="https://player.vimeo.com/video/' + id + '?portrait=0&color=333&badge=0" frameborder="0" allowfullscreen></iframe></div>'

  describe 'regex', ->

    regex = z.media.MediaEmbeds.regex

    describe 'Spotify', ->

      re_spotify = regex.spotify

      it 'matches https://play.spotify.com/artist/7Ln80lUS6He07XvHI8qqHH', ->
        expect('https://play.spotify.com/artist/7Ln80lUS6He07XvHI8qqHH'.match(re_spotify)).not.toBeNull()

      it 'matches https://open.spotify.com/track/26fwlVGkISUr5P91hAeTW8', ->
        expect('https://open.spotify.com/track/26fwlVGkISUr5P91hAeTW8'.match(re_spotify)).not.toBeNull()

      it 'matches https://open.spotify.com/album/7iN0r7Sl624EkOUNUCOGu9', ->
        expect('https://open.spotify.com/album/7iN0r7Sl624EkOUNUCOGu9'.match(re_spotify)).not.toBeNull()

      it 'matches https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn', ->
        expect('https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn'.match(re_spotify)).not.toBeNull()

      # since this is not a link it will not render
      xit 'matches spotify:track:3EpA2bm37w6ho1iPn9YFQ8', ->
        expect('spotify:track:3EpA2bm37w6ho1iPn9YFQ8'.match(re_spotify)).not.toBeNull()

      it 'doesn’t match normal Spotify links', ->
        test_link_variants 'spotify', re_spotify

    describe 'SoundCloud', ->

      re_soundcloud = regex.soundcloud

      it 'matches https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod', ->
        expect('https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod'.match(re_soundcloud)).not.toBeNull()

      it 'matches https://soundcloud.com/onedirectionmusic/sets/liams-you-i-remix-playlist', ->
        expect('https://soundcloud.com/onedirectionmusic/sets/liams-you-i-remix-playlist'.match(re_soundcloud)).not.toBeNull()

      it 'doesn’t match https://soundcloud.com/dp-conference', ->
        expect('https://soundcloud.com/dp-conference'.match(re_soundcloud)).toBeNull()

      it 'matches https://soundcloud.com/groups/playlist-digital-sintonia', ->
        expect('https://soundcloud.com/groups/playlist-digital-sintonia'.match(re_soundcloud)).not.toBeNull()

      it 'doesn’t match normal SoundCloud links', ->
        test_link_variants 'soundcloud', re_soundcloud

    describe 'Vimeo', ->

      re_vimeo = regex.vimeo

      it 'matches https://vimeo.com/27999954', ->
        expect('https://vimeo.com/27999954'.match(re_vimeo)).not.toBeNull()

      it 'doesn’t match normal Vimeo links', ->
        test_link_variants 'vimeo', re_vimeo

  describe 'iframe creation', ->

    describe 'no rich media content', ->

      it 'renders a normal link', ->
        message = '<a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>'
        expect(z.media.MediaParser.render_media_embeds message).toBe message

      it 'renders a normal link with text', ->
        message = 'Check this <a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>'
        expect(z.media.MediaParser.render_media_embeds message).toBe message

    describe 'YouTube', ->

      it 'does not render a youtube link without video id', ->
        link = 'youtube.com'

        message = build_message_with_anchor link

        expect(z.media.MediaParser.render_media_embeds message).toBe

      it 'https://www.youtube.com/playlist?list=PLNy867I3fkD6LqNQdk5rAPb6xAI-SbZOd', ->
        link = 'https://www.youtube.com/playlist?list=PLNy867I3fkD6LqNQdk5rAPb6xAI-SbZOd'

        message = build_message_with_anchor link

        expect(z.media.MediaParser.render_media_embeds message).toBe message

      it 'renders link with params (http://www.youtube.com/watch?v=6o-nmK9WRGE&feature=player_embedded)', ->
        link = 'http://www.youtube.com/watch?v=6o-nmK9WRGE&feature=player_embedded'

        message = build_message_with_anchor link
        iframe = build_youtube_iframe link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders link with params (http://www.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index)', ->
        link = 'http://www.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index'

        message = build_message_with_anchor link
        iframe = build_youtube_iframe link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders link with params (http://www.youtube.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0)', ->
        link = 'http://www.youtube.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0'

        message = build_message_with_anchor link
        iframe = build_youtube_iframe link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders link with timestamp (http://www.youtube.com/watch?v=0zM3nApSvMg#t=0m10s)', ->
        link = 'http://www.youtube.com/watch?v=0zM3nApSvMg#t=0m10s'

        message = build_message_with_anchor link
        iframe = build_youtube_iframe link
        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders link with timestamp inverted (https://www.youtube.com/watch?t=125&v=CfEWiV8PoZo)', ->
        link = 'https://www.youtube.com/watch?t=125&v=CfEWiV8PoZo'

        message = build_message_with_anchor link
        iframe = build_youtube_iframe link
        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders embed link (http://www.youtube.com/embed/0zM3nApSvMg?rel=0)', ->
        link = 'http://www.youtube.com/embed/0zM3nApSvMg?rel=0'

        message = build_message_with_anchor link
        iframe = build_youtube_iframe link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders watch link (http://www.youtube.com/watch?v=0zM3nApSvMg)', ->
        link = 'http://www.youtube.com/watch?v=0zM3nApSvMg'

        message = build_message_with_anchor link
        iframe = build_youtube_iframe link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders a short link (http://youtu.be/0zM3nApSvMg)', ->
        link = 'http://youtu.be/0zM3nApSvMg'

        message = build_message_with_anchor link
        iframe = build_youtube_iframe link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders a short link playlist (https://youtu.be/oL1xf_X0W2s?list=PLuKg-WhduhkmIcFMN7wxfVWYu8qnk0jMN)', ->
        link = 'https://youtu.be/oL1xf_X0W2s?list=PLuKg-WhduhkmIcFMN7wxfVWYu8qnk0jMN'

        message = build_message_with_anchor link
        iframe = build_youtube_iframe link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders a mobile link (https://m.youtube.com/?#/watch?v=0zM3nApSvMg)', ->
        link = 'https://m.youtube.com/?#/watch?v=0zM3nApSvMg'

        message = build_message_with_anchor link
        iframe = build_youtube_iframe link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders another mobile link (https://www.youtube.com/watch?v=1w4Gf97q2oU&feature=youtu.be)', ->
        link = 'https://www.youtube.com/watch?v=1w4Gf97q2oU&feature=youtu.be'

        message = build_message_with_anchor link
        iframe = build_youtube_iframe link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'doesn`t render Youtube profile link', ->
        message = '<a href="https://www.youtube.com/user/GoogleWebDesigner" target="_blank" rel="nofollow">https://www.youtube.com/user/GoogleWebDesigner</a>'
        iframe = '<a href="https://www.youtube.com/user/GoogleWebDesigner" target="_blank" rel="nofollow">https://www.youtube.com/user/GoogleWebDesigner</a>'
        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'removes autoplay param from url (https://www.youtube.com/watch?v=oHg5SJYRHA0&autoplay=1)', ->
        link = 'https://www.youtube.com/watch?v=oHg5SJYRHA0&autoplay=1'

        message = build_message_with_anchor link
        iframe = '<a href="https://www.youtube.com/watch?v=oHg5SJYRHA0&autoplay=1" target="_blank" rel="nofollow">https://www.youtube.com/watch?v=oHg5SJYRHA0&autoplay=1</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="https://www.youtube.com/embed/oHg5SJYRHA0?html5=1" frameborder="0" allowfullscreen></iframe></div>'

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'removes autoplay param from url (https://www.youtube.com/watch?autoplay=1&v=oHg5SJYRHA0)', ->
        link = 'https://www.youtube.com/watch?autoplay=1&v=oHg5SJYRHA0'

        message = build_message_with_anchor link
        iframe = '<a href="https://www.youtube.com/watch?autoplay=1&v=oHg5SJYRHA0" target="_blank" rel="nofollow">https://www.youtube.com/watch?autoplay=1&v=oHg5SJYRHA0</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="https://www.youtube.com/embed/oHg5SJYRHA0?html5=1" frameborder="0" allowfullscreen></iframe></div>'

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

    describe 'SoundCloud', ->

      it 'renders a track (https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod)', ->
        link = 'https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod'

        message = build_message_with_anchor link
        iframe = build_soundcloud_iframe_for_tracks link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders a playlist (https://soundcloud.com/onedirectionmusic/sets/liams-you-i-remix-playlist)', ->
        link = 'https://soundcloud.com/onedirectionmusic/sets/liams-you-i-remix-playlist'

        message = build_message_with_anchor link
        iframe = build_soundcloud_iframe_for_playlists link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders profiles without embeds (https://soundcloud.com/dp-conference)', ->
        message = build_message_with_anchor 'https://soundcloud.com/dp-conference'
        expect(z.media.MediaParser.render_media_embeds message).toBe message

      it 'renders profiles without embeds even if profiles have a trailing slash (https://soundcloud.com/dp-conference/)', ->
        message = build_message_with_anchor 'https://soundcloud.com/dp-conference/'
        expect(z.media.MediaParser.render_media_embeds message).toBe message

      it 'renders a group (https://soundcloud.com/groups/playlist-digital-sintonia)', ->
        link = 'https://soundcloud.com/groups/playlist-digital-sintonia'

        message = build_message_with_anchor link
        iframe = build_soundcloud_iframe_for_tracks link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders a track without trailing slash (https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download)', ->
        link = 'https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download'

        message = build_message_with_anchor link
        iframe = build_soundcloud_iframe_for_tracks link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders a track with trailing slash (https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download/)', ->
        link = 'https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download/'

        message = build_message_with_anchor link
        iframe = build_soundcloud_iframe_for_tracks link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'doesn’t render links which cannot be rendered (https://soundcloud.com/fdvm/lulleaux-fdvm-up-to-you-original-mix/recommended)', ->
        link = 'https://soundcloud.com/fdvm/lulleaux-fdvm-up-to-you-original-mix/recommended'
        message = '<a href="'+link+'" target="_blank" rel="nofollow">'+link+'</a>'
        expect(z.media.MediaParser.render_media_embeds message).toBe message

    describe 'Spotify', ->

      it 'renders artists (https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn)', ->
        link = 'https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn'
        partial_link = 'user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn'

        message = build_message_with_anchor link
        iframe = build_spotify_iframe link, partial_link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders track (https://open.spotify.com/track/26fwlVGkISUr5P91hAeTW8)', ->
        link = 'https://open.spotify.com/track/26fwlVGkISUr5P91hAeTW8'
        partial_link = 'track/26fwlVGkISUr5P91hAeTW8'

        message = build_message_with_anchor link
        iframe = build_spotify_iframe link, partial_link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders album (https://open.spotify.com/album/7iN0r7Sl624EkOUNUCOGu9)', ->
        link = 'https://open.spotify.com/album/7iN0r7Sl624EkOUNUCOGu9'
        partial_link = 'album/7iN0r7Sl624EkOUNUCOGu9'

        message = build_message_with_anchor link
        iframe = build_spotify_iframe link, partial_link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders playlist (https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn)', ->
        link = 'https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn'
        partial_link = 'user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn'

        message = build_message_with_anchor link
        iframe = build_spotify_iframe link, partial_link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

      it 'renders track with params (https://play.spotify.com/track/5yEPxDjbbzUzyauGtnmVEC?play=true&utm_source=open.spotify.com&utm_medium=open)', ->
        link = 'https://play.spotify.com/track/5yEPxDjbbzUzyauGtnmVEC?play=true&utm_source=open.spotify.com&utm_medium=open'
        partial_link = 'track/5yEPxDjbbzUzyauGtnmVEC'

        message = build_message_with_anchor link
        iframe = build_spotify_iframe link, partial_link

        expect(z.media.MediaParser.render_media_embeds message).toBe iframe

    describe 'Vimeo', ->

      it 'renders https://vimeo.com/27999954', ->
        id = '27999954'
        link = 'https://vimeo.com/27999954'

        message = build_message_with_anchor link
        iframe = build_vimeo_iframe link, id

        expect(z.media.MediaParser.render_media_embeds message, '#333').toBe iframe

      it 'doesn’t render user https://vimeo.com/user38597062', ->
        message = build_message_with_anchor 'https://vimeo.com/user38597062'
        expect(z.media.MediaParser.render_media_embeds message, '#333').toBe message

      it 'renders link with params (https://vimeo.com/channels/staffpicks/127053285?utm_source=social&utm_campaign=9914)', ->
        id = '127053285'
        link = 'https://vimeo.com/channels/staffpicks/127053285?utm_source=social&utm_campaign=9914'

        message = build_message_with_anchor link
        iframe = build_vimeo_iframe link, id

        expect(z.media.MediaParser.render_media_embeds message, '#333').toBe iframe

  describe 'convert_youtube_timestamp_to_seconds', ->

    it 'doesn´t convert timestamp that only contains numbers', ->
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds '125').toBe 125

    it 'converts timestamp with only seconds', ->
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds '25s').toBe 25

    it 'converts timestamp with only minutes and seconds', ->
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds '31m08s').toBe 1868

    it 'converts timestamp with hours, minutes and seconds', ->
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds '1h1m1s').toBe 3661

    it 'converts invalid values to 0', ->
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds 'hms').toBe 0
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds null).toBe 0
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds()).toBe 0

