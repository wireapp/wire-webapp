/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use strict';

// grunt test_init && grunt test_run:media/MediaEmbeds

// grunt test_init && grunt test_run:media/MediaEmbeds
describe('MediaEmbeds', function() {
// Will test all common link variations
  const test_link_variants = function(site, re) {
    expect(`http://${site}.com`.match(re)).toBe(null);
    expect(`https://${site}.com`.match(re)).toBe(null);
    expect(`${site}.com`.match(re)).toBe(null);
    expect(`http://m.${site}.com`.match(re)).toBe(null);
    expect(`https://m.${site}.com`.match(re)).toBe(null);
    expect(`m.${site}.com`.match(re)).toBe(null);
    expect(`www.${site}.com`.match(re)).toBe(null);
  };

  const build_message_with_anchor = (link) => `<a href="${link}" target="_blank" rel="nofollow">${link}</a>`;

  const build_youtube_iframe = function(link) {
    const embed_url = z.media.MediaEmbeds.generate_youtube_embed_url(link);
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="${embed_url}" frameborder="0" allowfullscreen></iframe></div>`;
  };

  const build_soundcloud_iframe_for_tracks = function(link) {
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container"><iframe class="soundcloud" width="100%" height="164" src="https://w.soundcloud.com/player/?url=${link}&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true" frameborder="0"></iframe></div>`;
  };

  const build_soundcloud_iframe_for_playlists = function(link) {
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container"><iframe class="soundcloud" width="100%" height="465" src="https://w.soundcloud.com/player/?url=${link}&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true" frameborder="0"></iframe></div>`;
  };

  const build_spotify_iframe = function(link, partial_link) {
    partial_link = partial_link.replace(/\//g, ':');
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container"><iframe class="spotify" width="100%" height="80px" src="https://embed.spotify.com/?uri=spotify%3A${window.encodeURIComponent(partial_link)}" frameborder="0"></iframe></div>`;
  };

  const build_vimeo_iframe = function(link, id) {
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container iframe-container-video"><iframe class="vimeo" width="100%" height="100%" src="https://player.vimeo.com/video/${id}?portrait=0&color=333&badge=0" frameborder="0" allowfullscreen></iframe></div>`;
  };

  describe('regex', function() {
    const {regex} = z.media.MediaEmbeds;

    describe('Spotify', function() {
      const re_spotify = regex.spotify;

      it('should match valid Spotify URLs', function() {
        expect('https://play.spotify.com/artist/7Ln80lUS6He07XvHI8qqHH'.match(re_spotify)).not.toBeNull();
        expect('https://open.spotify.com/track/26fwlVGkISUr5P91hAeTW8'.match(re_spotify)).not.toBeNull();
        expect('https://open.spotify.com/album/7iN0r7Sl624EkOUNUCOGu9'.match(re_spotify)).not.toBeNull();
        expect('https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn'.match(re_spotify)).not.toBeNull();
      });

      // since this is not a link it will not render
      xit('matches spotify:track:3EpA2bm37w6ho1iPn9YFQ8', function() {
        expect('spotify:track:3EpA2bm37w6ho1iPn9YFQ8'.match(re_spotify)).not.toBeNull();
      });

      it('doesn’t match normal Spotify links', function() {
        test_link_variants('spotify', re_spotify);
      });
    });

    describe('SoundCloud', function() {
      const re_soundcloud = regex.soundcloud;

      it('should match valid SoundCloud URLs', function() {
        expect('https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod'.match(re_soundcloud)).not.toBeNull();
        expect('https://soundcloud.com/onedirectionmusic/sets/liams-you-i-remix-playlist'.match(re_soundcloud)).not.toBeNull();
        expect('https://soundcloud.com/groups/playlist-digital-sintonia'.match(re_soundcloud)).not.toBeNull();
      });

      it('doesn’t match https://soundcloud.com/dp-conference', function() {
        expect('https://soundcloud.com/dp-conference'.match(re_soundcloud)).toBeNull();
      });

      it('doesn’t match normal SoundCloud links', function() {
        test_link_variants('soundcloud', re_soundcloud);
      });
    });

    describe('Vimeo', function() {
      const re_vimeo = regex.vimeo;

      it('matches valid Vimeo URLs', function() {
        expect('https://vimeo.com/27999954'.match(re_vimeo)).not.toBeNull();
      });

      it('doesn’t match normal Vimeo links', function() {
        test_link_variants('vimeo', re_vimeo);
      });
    });
  });

  describe('iframe creation', function() {
    describe('no rich media content', function() {
      it('renders a normal link', function() {
        const message = '<a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>';
        expect(z.media.MediaParser.render_media_embeds(message)).toBe(message);
      });

      it('renders a normal link with text', function() {
        const message = 'Check this <a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>';
        expect(z.media.MediaParser.render_media_embeds(message)).toBe(message);
      });
    });

    describe('YouTube', function() {
      it('does not render a youtube link without video id', function() {
        const link = 'youtube.com';
        const message = build_message_with_anchor(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(message);
      });

      it('https://www.youtube.com/playlist?list=PLNy867I3fkD6LqNQdk5rAPb6xAI-SbZOd', function() {
        const link = 'https://www.youtube.com/playlist?list=PLNy867I3fkD6LqNQdk5rAPb6xAI-SbZOd';
        const message = build_message_with_anchor(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(message);
      });

      it('renders link with params (http://www.youtube.com/watch?v=6o-nmK9WRGE&feature=player_embedded)', function() {
        const link = 'http://www.youtube.com/watch?v=6o-nmK9WRGE&feature=player_embedded';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders link with params (http://www.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index)', function() {
        const link = 'http://www.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders link with params (http://www.youtube.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0)', function() {
        const link = 'http://www.youtube.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders link with timestamp (http://www.youtube.com/watch?v=0zM3nApSvMg#t=0m10s)', function() {
        const link = 'http://www.youtube.com/watch?v=0zM3nApSvMg#t=0m10s';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);
        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders link with timestamp inverted (https://www.youtube.com/watch?t=125&v=CfEWiV8PoZo)', function() {
        const link = 'https://www.youtube.com/watch?t=125&v=CfEWiV8PoZo';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);
        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders embed link (http://www.youtube.com/embed/0zM3nApSvMg?rel=0)', function() {
        const link = 'http://www.youtube.com/embed/0zM3nApSvMg?rel=0';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders watch link (http://www.youtube.com/watch?v=0zM3nApSvMg)', function() {
        const link = 'http://www.youtube.com/watch?v=0zM3nApSvMg';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders a short link (http://youtu.be/0zM3nApSvMg)', function() {
        const link = 'http://youtu.be/0zM3nApSvMg';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders a short link playlist (https://youtu.be/oL1xf_X0W2s?list=PLuKg-WhduhkmIcFMN7wxfVWYu8qnk0jMN)', function() {
        const link = 'https://youtu.be/oL1xf_X0W2s?list=PLuKg-WhduhkmIcFMN7wxfVWYu8qnk0jMN';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders a mobile link (https://m.youtube.com/?#/watch?v=0zM3nApSvMg)', function() {
        const link = 'https://m.youtube.com/?#/watch?v=0zM3nApSvMg';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders another mobile link (https://www.youtube.com/watch?v=1w4Gf97q2oU&feature=youtu.be)', function() {
        const link = 'https://www.youtube.com/watch?v=1w4Gf97q2oU&feature=youtu.be';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('doesn`t render Youtube profile link', function() {
        const message = '<a href="https://www.youtube.com/user/GoogleWebDesigner" target="_blank" rel="nofollow">https://www.youtube.com/user/GoogleWebDesigner</a>';
        const iframe = '<a href="https://www.youtube.com/user/GoogleWebDesigner" target="_blank" rel="nofollow">https://www.youtube.com/user/GoogleWebDesigner</a>';
        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('removes autoplay param from url (https://www.youtube.com/watch?v=oHg5SJYRHA0&autoplay=1)', function() {
        const link = 'https://www.youtube.com/watch?v=oHg5SJYRHA0&autoplay=1';

        const message = build_message_with_anchor(link);
        const iframe = '<a href="https://www.youtube.com/watch?v=oHg5SJYRHA0&autoplay=1" target="_blank" rel="nofollow">https://www.youtube.com/watch?v=oHg5SJYRHA0&autoplay=1</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="https://www.youtube.com/embed/oHg5SJYRHA0?html5=1" frameborder="0" allowfullscreen></iframe></div>';

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      return it('removes autoplay param from url (https://www.youtube.com/watch?autoplay=1&v=oHg5SJYRHA0)', function() {
        const link = 'https://www.youtube.com/watch?autoplay=1&v=oHg5SJYRHA0';

        const message = build_message_with_anchor(link);
        const iframe = '<a href="https://www.youtube.com/watch?autoplay=1&v=oHg5SJYRHA0" target="_blank" rel="nofollow">https://www.youtube.com/watch?autoplay=1&v=oHg5SJYRHA0</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="https://www.youtube.com/embed/oHg5SJYRHA0?html5=1" frameborder="0" allowfullscreen></iframe></div>';

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });
    });

    describe('SoundCloud', function() {
      it('renders a track (https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod)', function() {
        const link = 'https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod';

        const message = build_message_with_anchor(link);
        const iframe = build_soundcloud_iframe_for_tracks(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders a playlist (https://soundcloud.com/onedirectionmusic/sets/liams-you-i-remix-playlist)', function() {
        const link = 'https://soundcloud.com/onedirectionmusic/sets/liams-you-i-remix-playlist';

        const message = build_message_with_anchor(link);
        const iframe = build_soundcloud_iframe_for_playlists(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders profiles without embeds (https://soundcloud.com/dp-conference)', function() {
        const message = build_message_with_anchor('https://soundcloud.com/dp-conference');
        expect(z.media.MediaParser.render_media_embeds(message)).toBe(message);
      });

      it('renders profiles without embeds even if profiles have a trailing slash (https://soundcloud.com/dp-conference/)', function() {
        const message = build_message_with_anchor('https://soundcloud.com/dp-conference/');
        expect(z.media.MediaParser.render_media_embeds(message)).toBe(message);
      });

      it('renders a group (https://soundcloud.com/groups/playlist-digital-sintonia)', function() {
        const link = 'https://soundcloud.com/groups/playlist-digital-sintonia';

        const message = build_message_with_anchor(link);
        const iframe = build_soundcloud_iframe_for_tracks(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders a track without trailing slash (https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download)', function() {
        const link = 'https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download';

        const message = build_message_with_anchor(link);
        const iframe = build_soundcloud_iframe_for_tracks(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders a track with trailing slash (https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download/)', function() {
        const link = 'https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download/';

        const message = build_message_with_anchor(link);
        const iframe = build_soundcloud_iframe_for_tracks(link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      return it('doesn’t render links which cannot be rendered (https://soundcloud.com/fdvm/lulleaux-fdvm-up-to-you-original-mix/recommended)', function() {
        const link = 'https://soundcloud.com/fdvm/lulleaux-fdvm-up-to-you-original-mix/recommended';
        const message = `<a href="${link}" target="_blank" rel="nofollow">${link}</a>`;
        expect(z.media.MediaParser.render_media_embeds(message)).toBe(message);
      });
    });

    describe('Spotify', function() {

      it('renders artists (https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn)', function() {
        const link = 'https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';
        const partial_link = 'user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';

        const message = build_message_with_anchor(link);
        const iframe = build_spotify_iframe(link, partial_link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders track (https://open.spotify.com/track/26fwlVGkISUr5P91hAeTW8)', function() {
        const link = 'https://open.spotify.com/track/26fwlVGkISUr5P91hAeTW8';
        const partial_link = 'track/26fwlVGkISUr5P91hAeTW8';

        const message = build_message_with_anchor(link);
        const iframe = build_spotify_iframe(link, partial_link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders album (https://open.spotify.com/album/7iN0r7Sl624EkOUNUCOGu9)', function() {
        const link = 'https://open.spotify.com/album/7iN0r7Sl624EkOUNUCOGu9';
        const partial_link = 'album/7iN0r7Sl624EkOUNUCOGu9';

        const message = build_message_with_anchor(link);
        const iframe = build_spotify_iframe(link, partial_link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      it('renders playlist (https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn)', function() {
        const link = 'https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';
        const partial_link = 'user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';

        const message = build_message_with_anchor(link);
        const iframe = build_spotify_iframe(link, partial_link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });

      return it('renders track with params (https://play.spotify.com/track/5yEPxDjbbzUzyauGtnmVEC?play=true&utm_source=open.spotify.com&utm_medium=open)', function() {
        const link = 'https://play.spotify.com/track/5yEPxDjbbzUzyauGtnmVEC?play=true&utm_source=open.spotify.com&utm_medium=open';
        const partial_link = 'track/5yEPxDjbbzUzyauGtnmVEC';

        const message = build_message_with_anchor(link);
        const iframe = build_spotify_iframe(link, partial_link);

        expect(z.media.MediaParser.render_media_embeds(message)).toBe(iframe);
      });
    });

    describe('Vimeo', function() {
      it('renders https://vimeo.com/27999954', function() {
        const id = '27999954';
        const link = 'https://vimeo.com/27999954';

        const message = build_message_with_anchor(link);
        const iframe = build_vimeo_iframe(link, id);

        expect(z.media.MediaParser.render_media_embeds(message, '#333')).toBe(iframe);
      });

      it('doesn’t render user https://vimeo.com/user38597062', function() {
        const message = build_message_with_anchor('https://vimeo.com/user38597062');
        expect(z.media.MediaParser.render_media_embeds(message, '#333')).toBe(message);
      });

      return it('renders link with params (https://vimeo.com/channels/staffpicks/127053285?utm_source=social&utm_campaign=9914)', function() {
        const id = '127053285';
        const link = 'https://vimeo.com/channels/staffpicks/127053285?utm_source=social&utm_campaign=9914';

        const message = build_message_with_anchor(link);
        const iframe = build_vimeo_iframe(link, id);

        expect(z.media.MediaParser.render_media_embeds(message, '#333')).toBe(iframe);
      });
    });
  });

  describe('convert_youtube_timestamp_to_seconds', function() {

    it('doesn´t convert timestamp that only contains numbers', function() {
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds('125')).toBe(125);
    });

    it('converts timestamp with only seconds', function() {
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds('25s')).toBe(25);
    });

    it('converts timestamp with only minutes and seconds', function() {
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds('31m08s')).toBe(1868);
    });

    it('converts timestamp with hours, minutes and seconds', function() {
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds('1h1m1s')).toBe(3661);
    });

    it('converts invalid values to 0', function() {
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds('hms')).toBe(0);
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds(null)).toBe(0);
      expect(z.media.MediaEmbeds.convert_youtube_timestamp_to_seconds()).toBe(0);
    });
  });
});

