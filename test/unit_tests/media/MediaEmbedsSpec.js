/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {MediaEmbeds} from 'src/script/media/MediaEmbeds';
import {mediaParser} from 'src/script/media/MediaParser';

describe('MediaEmbeds', () => {
  // Will test all common link variations
  const test_link_variants = (site, re) => {
    expect(`http://${site}.com`.match(re)).toBe(null);
    expect(`http://${site}.com/`.match(re)).toBe(null);
    expect(`https://${site}.com`.match(re)).toBe(null);
    expect(`https://${site}.com/`.match(re)).toBe(null);
    expect(`${site}.com`.match(re)).toBe(null);
    expect(`${site}.com/`.match(re)).toBe(null);
    expect(`http://m.${site}.com`.match(re)).toBe(null);
    expect(`http://m.${site}.com/`.match(re)).toBe(null);
    expect(`https://m.${site}.com`.match(re)).toBe(null);
    expect(`https://m.${site}.com/`.match(re)).toBe(null);
    expect(`m.${site}.com`.match(re)).toBe(null);
    expect(`m.${site}.com/`.match(re)).toBe(null);
    expect(`www.${site}.com`.match(re)).toBe(null);
    expect(`www.${site}.com/`.match(re)).toBe(null);
  };

  const build_message_with_anchor = link => `<a href="${link}" target="_blank" rel="nofollow">${link}</a>`;

  const build_youtube_iframe = link => {
    const embed_url = MediaEmbeds.generateYouTubeEmbedUrl(link);
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="${embed_url}" frameborder="0" allowfullscreen></iframe></div>`;
  };

  const build_soundcloud_iframe_for_tracks = link => {
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container"><iframe class="soundcloud" width="100%" height="164" src="https://w.soundcloud.com/player/?url=${link}&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true" frameborder="0"></iframe></div>`;
  };

  const build_soundcloud_iframe_for_playlists = link => {
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container"><iframe class="soundcloud" width="100%" height="465" src="https://w.soundcloud.com/player/?url=${link}&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true" frameborder="0"></iframe></div>`;
  };

  const build_spotify_iframe = (link, partial_link) => {
    partial_link = partial_link.replace(/\//g, ':');
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container"><iframe class="spotify" width="100%" height="80px" src="https://embed.spotify.com/?uri=spotify%3A${window.encodeURIComponent(
      partial_link,
    )}" frameborder="0"></iframe></div>`;
  };

  const build_vimeo_iframe = (link, id) => {
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container iframe-container-video"><iframe class="vimeo" width="100%" height="100%" src="https://player.vimeo.com/video/${id}?portrait=0&color=333&badge=0" frameborder="0" allowfullscreen></iframe></div>`;
  };

  describe('regex', () => {
    const regex = MediaEmbeds.regex;

    describe('Spotify', () => {
      const re_spotify = regex.spotify;

      it('should match valid Spotify URLs', () => {
        expect('https://play.spotify.com/artist/7Ln80lUS6He07XvHI8qqHH'.match(re_spotify)).not.toBeNull();
        expect('https://open.spotify.com/track/26fwlVGkISUr5P91hAeTW8'.match(re_spotify)).not.toBeNull();
        expect('https://open.spotify.com/album/7iN0r7Sl624EkOUNUCOGu9'.match(re_spotify)).not.toBeNull();
        expect(
          'https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn'.match(re_spotify),
        ).not.toBeNull();
      });

      it("doesn't match normal Spotify links", () => {
        test_link_variants('spotify', re_spotify);
      });
    });

    describe('SoundCloud', () => {
      const re_soundcloud = regex.soundcloud;

      it('should match valid SoundCloud URLs', () => {
        expect('https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod'.match(re_soundcloud)).not.toBeNull();
        expect(
          'https://soundcloud.com/onedirectionmusic/sets/liams-you-i-remix-playlist'.match(re_soundcloud),
        ).not.toBeNull();

        expect('https://soundcloud.com/groups/playlist-digital-sintonia'.match(re_soundcloud)).not.toBeNull();
      });

      it("doesn't match https://soundcloud.com/dp-conference", () => {
        expect('https://soundcloud.com/dp-conference'.match(re_soundcloud)).toBeNull();
      });

      it("doesn't match normal SoundCloud links", () => {
        test_link_variants('soundcloud', re_soundcloud);
      });
    });

    describe('Vimeo', () => {
      const re_vimeo = regex.vimeo;

      it('matches valid Vimeo URLs', () => {
        expect('https://vimeo.com/27999954'.match(re_vimeo)).not.toBeNull();
      });

      it('matches valid Vimeo embed URLs', () => {
        expect('https://player.vimeo.com/video/27999954'.match(re_vimeo)).not.toBeNull();
      });

      it("doesn't match normal Vimeo links", () => {
        test_link_variants('vimeo', re_vimeo);
      });
    });
  });

  describe('iframe creation', () => {
    describe('no rich media content', () => {
      it('renders a normal link', () => {
        const message = '<a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>';

        expect(mediaParser.renderMediaEmbeds(message)).toBe(message);
      });

      it('renders a normal link with text', () => {
        const message =
          'Check this <a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>';

        expect(mediaParser.renderMediaEmbeds(message)).toBe(message);
      });
    });

    describe('YouTube', () => {
      it('does not render a YouTube link without video id', () => {
        const link = 'youtube-nocookie.com';
        const message = build_message_with_anchor(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(message);
      });

      it('does not render a malicious YouTube link', () => {
        const link = 'https://xn--yutube-wqf.com/#youtu0be/v/fKopy74weus';
        const message = build_message_with_anchor(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(message);
      });

      it('renders a playlist', () => {
        const link = 'https://www.youtube-nocookie.com/playlist?list=PLNy867I3fkD6LqNQdk5rAPb6xAI-SbZOd';
        const message = build_message_with_anchor(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(message);
      });

      it('renders a link with params', () => {
        const link = 'http://www.youtube-nocookie.com/watch?v=6o-nmK9WRGE&feature=player_embedded';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a link with params', () => {
        const link = 'http://www.youtube-nocookie.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a link with params', () => {
        const link = 'http://www.youtube-nocookie.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a link with timestamp', () => {
        const link = 'http://www.youtube-nocookie.com/watch?v=0zM3nApSvMg#t=0m10s';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a link with timestamp inverted', () => {
        const link = 'https://www.youtube-nocookie.com/watch?t=125&v=CfEWiV8PoZo';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders an embed link', () => {
        const link = 'http://www.youtube-nocookie.com/embed/0zM3nApSvMg?rel=0';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a watch link', () => {
        const link = 'http://www.youtube-nocookie.com/watch?v=0zM3nApSvMg';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a short link', () => {
        const link = 'http://youtu.be/0zM3nApSvMg';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a short link playlist', () => {
        const link = 'https://youtu.be/oL1xf_X0W2s?list=PLuKg-WhduhkmIcFMN7wxfVWYu8qnk0jMN';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a mobile link', () => {
        const link = 'https://m.youtube-nocookie.com/?#/watch?v=0zM3nApSvMg';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders another mobile link', () => {
        const link = 'https://www.youtube-nocookie.com/watch?v=1w4Gf97q2oU&feature=youtu.be';

        const message = build_message_with_anchor(link);
        const iframe = build_youtube_iframe(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it("doesn't render a YouTube profile link", () => {
        const message =
          '<a href="https://www.youtube-nocookie.com/user/GoogleWebDesigner" target="_blank" rel="nofollow">https://www.youtube-nocookie.com/user/GoogleWebDesigner</a>';
        const iframe =
          '<a href="https://www.youtube-nocookie.com/user/GoogleWebDesigner" target="_blank" rel="nofollow">https://www.youtube-nocookie.com/user/GoogleWebDesigner</a>';

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('removes autoplay param from url', () => {
        const link = 'https://www.youtube-nocookie.com/watch?v=oHg5SJYRHA0&autoplay=1';

        const message = build_message_with_anchor(link);
        const iframe =
          '<a href="https://www.youtube-nocookie.com/watch?v=oHg5SJYRHA0&autoplay=1" target="_blank" rel="nofollow">https://www.youtube-nocookie.com/watch?v=oHg5SJYRHA0&autoplay=1</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/oHg5SJYRHA0?html5=1&enablejsapi=0&modestbranding=1&rel=0" frameborder="0" allowfullscreen></iframe></div>';

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('removes autoplay param from url', () => {
        const link = 'https://www.youtube-nocookie.com/watch?autoplay=1&v=oHg5SJYRHA0';

        const message = build_message_with_anchor(link);
        const iframe =
          '<a href="https://www.youtube-nocookie.com/watch?autoplay=1&v=oHg5SJYRHA0" target="_blank" rel="nofollow">https://www.youtube-nocookie.com/watch?autoplay=1&v=oHg5SJYRHA0</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/oHg5SJYRHA0?html5=1&enablejsapi=0&modestbranding=1&rel=0" frameborder="0" allowfullscreen></iframe></div>';

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });
    });

    describe('SoundCloud', () => {
      it('renders a track', () => {
        const link = 'https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod';

        const message = build_message_with_anchor(link);
        const iframe = build_soundcloud_iframe_for_tracks(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a playlist', () => {
        const link = 'https://soundcloud.com/onedirectionmusic/sets/liams-you-i-remix-playlist';

        const message = build_message_with_anchor(link);
        const iframe = build_soundcloud_iframe_for_playlists(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders profiles without embeds', () => {
        const message = build_message_with_anchor('https://soundcloud.com/dp-conference');

        expect(mediaParser.renderMediaEmbeds(message)).toBe(message);
      });

      it('renders profiles without embeds even if profiles have a trailing slash', () => {
        const message = build_message_with_anchor('https://soundcloud.com/dp-conference/');

        expect(mediaParser.renderMediaEmbeds(message)).toBe(message);
      });

      it('renders a group', () => {
        const link = 'https://soundcloud.com/groups/playlist-digital-sintonia';

        const message = build_message_with_anchor(link);
        const iframe = build_soundcloud_iframe_for_tracks(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a track without trailing slash', () => {
        const link = 'https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download';

        const message = build_message_with_anchor(link);
        const iframe = build_soundcloud_iframe_for_tracks(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a track with trailing slash', () => {
        const link = 'https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download/';

        const message = build_message_with_anchor(link);
        const iframe = build_soundcloud_iframe_for_tracks(link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it("doesn't render SoundCloud links which cannot be rendered", () => {
        const link = 'https://soundcloud.com/fdvm/lulleaux-fdvm-up-to-you-original-mix/recommended';
        const message = `<a href="${link}" target="_blank" rel="nofollow">${link}</a>`;

        expect(mediaParser.renderMediaEmbeds(message)).toBe(message);
      });
    });

    describe('Spotify', () => {
      it('renders artists', () => {
        const link = 'https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';
        const partial_link = 'user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';

        const message = build_message_with_anchor(link);
        const iframe = build_spotify_iframe(link, partial_link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a track', () => {
        const link = 'https://open.spotify.com/track/26fwlVGkISUr5P91hAeTW8';
        const partial_link = 'track/26fwlVGkISUr5P91hAeTW8';

        const message = build_message_with_anchor(link);
        const iframe = build_spotify_iframe(link, partial_link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders an album', () => {
        const link = 'https://open.spotify.com/album/7iN0r7Sl624EkOUNUCOGu9';
        const partial_link = 'album/7iN0r7Sl624EkOUNUCOGu9';

        const message = build_message_with_anchor(link);
        const iframe = build_spotify_iframe(link, partial_link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a playlist (https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn)', () => {
        const link = 'https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';
        const partial_link = 'user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';

        const message = build_message_with_anchor(link);
        const iframe = build_spotify_iframe(link, partial_link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a track with params', () => {
        const link =
          'https://play.spotify.com/track/5yEPxDjbbzUzyauGtnmVEC?play=true&utm_source=open.spotify.com&utm_medium=open';
        const partial_link = 'track/5yEPxDjbbzUzyauGtnmVEC';

        const message = build_message_with_anchor(link);
        const iframe = build_spotify_iframe(link, partial_link);

        expect(mediaParser.renderMediaEmbeds(message)).toBe(iframe);
      });
    });

    describe('Vimeo', () => {
      it('renders a video', () => {
        const id = '27999954';
        const link = 'https://vimeo.com/27999954';

        const message = build_message_with_anchor(link);
        const iframe = build_vimeo_iframe(link, id);

        expect(mediaParser.renderMediaEmbeds(message, '#333')).toBe(iframe);
      });

      it("doesn't render a user's profile page", () => {
        const message = build_message_with_anchor('https://vimeo.com/user38597062');

        expect(mediaParser.renderMediaEmbeds(message, '#333')).toBe(message);
      });

      it('renders a link with params', () => {
        const id = '127053285';
        const link = 'https://vimeo.com/channels/staffpicks/127053285?utm_source=social&utm_campaign=9914';

        const message = build_message_with_anchor(link);
        const iframe = build_vimeo_iframe(link, id);

        expect(mediaParser.renderMediaEmbeds(message, '#333')).toBe(iframe);
      });
    });
  });

  describe('convertYouTubeTimestampToSeconds', () => {
    it("doesn't convert a timestamp that only contains numbers", () => {
      expect(MediaEmbeds.convertYouTubeTimestampToSeconds('125')).toBe(125);
    });

    it('converts a timestamp with only seconds', () => {
      expect(MediaEmbeds.convertYouTubeTimestampToSeconds('25s')).toBe(25);
    });

    it('converts a timestamp with only minutes and seconds', () => {
      expect(MediaEmbeds.convertYouTubeTimestampToSeconds('31m08s')).toBe(1868);
    });

    it('converts a timestamp with hours, minutes and seconds', () => {
      expect(MediaEmbeds.convertYouTubeTimestampToSeconds('1h1m1s')).toBe(3661);
    });

    it('converts invalid values to 0', () => {
      expect(MediaEmbeds.convertYouTubeTimestampToSeconds('hms')).toBe(0);
      expect(MediaEmbeds.convertYouTubeTimestampToSeconds(null)).toBe(0);
      expect(MediaEmbeds.convertYouTubeTimestampToSeconds()).toBe(0);
    });
  });
});
