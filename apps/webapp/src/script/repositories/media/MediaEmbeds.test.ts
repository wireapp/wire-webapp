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

import {Configuration, Config} from 'src/script/Config';

import type {TypeUtil} from '@wireapp/commons';

import {MediaEmbeds} from './MediaEmbeds';
import {MediaParser} from './MediaParser';

describe('MediaEmbeds', () => {
  // Will test all common link variations
  const testLinkVariants = (site: string, re: RegExp) => {
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

  const buildMessageWithAnchor = (link: string) => `<a href="${link}" target="_blank" rel="nofollow">${link}</a>`;

  const buildYoutubeIframe = (link: string) => {
    const embed_url = MediaEmbeds.generateYouTubeEmbedUrl(link);
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="${embed_url}" frameborder="0" allowfullscreen></iframe></div>`;
  };

  const buildSoundcloudIframeForTracks = (link: string) => {
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container"><iframe class="soundcloud" width="100%" height="164" src="https://w.soundcloud.com/player/?url=${link}&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true" frameborder="0"></iframe></div>`;
  };

  const buildSoundcloudIframeForPlaylists = (link: string) => {
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container"><iframe class="soundcloud" width="100%" height="465" src="https://w.soundcloud.com/player/?url=${link}&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true" frameborder="0"></iframe></div>`;
  };

  const buildSpotifyIframe = (link: string, partial_link: string) => {
    partial_link = partial_link.replace(/\//g, ':');
    return `<a href="${link}" target="_blank" rel="nofollow">${link}</a><div class="iframe-container"><iframe class="spotify" width="100%" height="80px" src="https://embed.spotify.com/?uri=spotify%3A${window.encodeURIComponent(
      partial_link,
    )}" frameborder="0"></iframe></div>`;
  };

  const buildVimeoIframe = (link: string, id: string) => {
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
        testLinkVariants('spotify', re_spotify);
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
        testLinkVariants('soundcloud', re_soundcloud);
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
        testLinkVariants('vimeo', re_vimeo);
      });
    });
  });

  describe('iframe creation', () => {
    describe('no rich media content', () => {
      it('renders a normal link', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const message = '<a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>';

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });

      it('renders a normal link with text', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const message =
          'Check this <a href="https://www.google.com" target="_blank" rel="nofollow">https://www.google.com</a>';

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });
    });

    describe('YouTube', () => {
      it('does not render a YouTube link without video id', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'youtube-nocookie.com';
        const message = buildMessageWithAnchor(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });

      it('does not render a malicious YouTube link', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://xn--yutube-wqf.com/#youtu0be/v/fKopy74weus';
        const message = buildMessageWithAnchor(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });

      it('does not render a link with disabled config feature', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: false,
          },
        });
        const link = 'http://www.youtube-nocookie.com/watch?v=6o-nmK9WRGE&feature=player_embedded';

        const message = buildMessageWithAnchor(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });

      it('renders a playlist', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://www.youtube-nocookie.com/playlist?list=PLNy867I3fkD6LqNQdk5rAPb6xAI-SbZOd';
        const message = buildMessageWithAnchor(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });

      it('renders a link with params', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'http://www.youtube-nocookie.com/watch?v=6o-nmK9WRGE&feature=player_embedded';

        const message = buildMessageWithAnchor(link);
        const iframe = buildYoutubeIframe(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a link with params', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'http://www.youtube-nocookie.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index';

        const message = buildMessageWithAnchor(link);
        const iframe = buildYoutubeIframe(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a link with params', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'http://www.youtube-nocookie.com/v/0zM3nApSvMg?fs=1&hl=en_US&rel=0';

        const message = buildMessageWithAnchor(link);
        const iframe = buildYoutubeIframe(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a link with timestamp', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'http://www.youtube-nocookie.com/watch?v=0zM3nApSvMg#t=0m10s';

        const message = buildMessageWithAnchor(link);
        const iframe = buildYoutubeIframe(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a link with timestamp inverted', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://www.youtube-nocookie.com/watch?t=125&v=CfEWiV8PoZo';

        const message = buildMessageWithAnchor(link);
        const iframe = buildYoutubeIframe(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders an embed link', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'http://www.youtube-nocookie.com/embed/0zM3nApSvMg?rel=0';

        const message = buildMessageWithAnchor(link);
        const iframe = buildYoutubeIframe(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a watch link', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'http://www.youtube-nocookie.com/watch?v=0zM3nApSvMg';

        const message = buildMessageWithAnchor(link);
        const iframe = buildYoutubeIframe(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a short link', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'http://youtu.be/0zM3nApSvMg';

        const message = buildMessageWithAnchor(link);
        const iframe = buildYoutubeIframe(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a short link playlist', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://youtu.be/oL1xf_X0W2s?list=PLuKg-WhduhkmIcFMN7wxfVWYu8qnk0jMN';

        const message = buildMessageWithAnchor(link);
        const iframe = buildYoutubeIframe(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a mobile link', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://m.youtube-nocookie.com/?#/watch?v=0zM3nApSvMg';

        const message = buildMessageWithAnchor(link);
        const iframe = buildYoutubeIframe(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders another mobile link', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://www.youtube-nocookie.com/watch?v=1w4Gf97q2oU&feature=youtu.be';

        const message = buildMessageWithAnchor(link);
        const iframe = buildYoutubeIframe(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it("doesn't render a YouTube profile link", () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const message =
          '<a href="https://www.youtube-nocookie.com/user/GoogleWebDesigner" target="_blank" rel="nofollow">https://www.youtube-nocookie.com/user/GoogleWebDesigner</a>';
        const iframe =
          '<a href="https://www.youtube-nocookie.com/user/GoogleWebDesigner" target="_blank" rel="nofollow">https://www.youtube-nocookie.com/user/GoogleWebDesigner</a>';

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('removes autoplay param from url', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://www.youtube-nocookie.com/watch?v=oHg5SJYRHA0&autoplay=1';

        const message = buildMessageWithAnchor(link);
        const iframe =
          '<a href="https://www.youtube-nocookie.com/watch?v=oHg5SJYRHA0&autoplay=1" target="_blank" rel="nofollow">https://www.youtube-nocookie.com/watch?v=oHg5SJYRHA0&autoplay=1</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/oHg5SJYRHA0?html5=1&enablejsapi=0&modestbranding=1&rel=0" frameborder="0" allowfullscreen></iframe></div>';

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('removes autoplay param from url', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://www.youtube-nocookie.com/watch?autoplay=1&v=oHg5SJYRHA0';

        const message = buildMessageWithAnchor(link);
        const iframe =
          '<a href="https://www.youtube-nocookie.com/watch?autoplay=1&v=oHg5SJYRHA0" target="_blank" rel="nofollow">https://www.youtube-nocookie.com/watch?autoplay=1&v=oHg5SJYRHA0</a><div class="iframe-container iframe-container-video"><iframe class="youtube" width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/oHg5SJYRHA0?html5=1&enablejsapi=0&modestbranding=1&rel=0" frameborder="0" allowfullscreen></iframe></div>';

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });
    });

    describe('SoundCloud', () => {
      it('does not renders a link with disabled config feature', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: false,
          },
        });
        const link = 'https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod';

        const message = buildMessageWithAnchor(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });

      it('renders a track', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod';

        const message = buildMessageWithAnchor(link);
        const iframe = buildSoundcloudIframeForTracks(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a playlist', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://soundcloud.com/onedirectionmusic/sets/liams-you-i-remix-playlist';

        const message = buildMessageWithAnchor(link);
        const iframe = buildSoundcloudIframeForPlaylists(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders profiles without embeds', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const message = buildMessageWithAnchor('https://soundcloud.com/dp-conference');

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });

      it('renders profiles without embeds even if profiles have a trailing slash', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const message = buildMessageWithAnchor('https://soundcloud.com/dp-conference/');

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });

      it('renders a group', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://soundcloud.com/groups/playlist-digital-sintonia';

        const message = buildMessageWithAnchor(link);
        const iframe = buildSoundcloudIframeForTracks(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a track without trailing slash', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download';

        const message = buildMessageWithAnchor(link);
        const iframe = buildSoundcloudIframeForTracks(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a track with trailing slash', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://soundcloud.com/florian-paetzold/limp-bizkit-my-way-florian-paetzold-remix-free-download/';

        const message = buildMessageWithAnchor(link);
        const iframe = buildSoundcloudIframeForTracks(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it("doesn't render SoundCloud links which cannot be rendered", () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://soundcloud.com/fdvm/lulleaux-fdvm-up-to-you-original-mix/recommended';
        const message = `<a href="${link}" target="_blank" rel="nofollow">${link}</a>`;

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });
    });

    describe('Spotify', () => {
      it('does not renders a link with disabled config feature', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: false,
          },
        });
        const link = 'https://open.spotify.com/track/26fwlVGkISUr5P91hAeTW8';

        const message = buildMessageWithAnchor(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });

      it('renders artists', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';
        const partial_link = 'user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';

        const message = buildMessageWithAnchor(link);
        const iframe = buildSpotifyIframe(link, partial_link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a track', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://open.spotify.com/track/26fwlVGkISUr5P91hAeTW8';
        const partial_link = 'track/26fwlVGkISUr5P91hAeTW8';

        const message = buildMessageWithAnchor(link);
        const iframe = buildSpotifyIframe(link, partial_link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders an album', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://open.spotify.com/album/7iN0r7Sl624EkOUNUCOGu9';
        const partial_link = 'album/7iN0r7Sl624EkOUNUCOGu9';

        const message = buildMessageWithAnchor(link);
        const iframe = buildSpotifyIframe(link, partial_link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a playlist (https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn)', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link = 'https://open.spotify.com/user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';
        const partial_link = 'user/1123867741/playlist/2w63WroxrrIbNg4WIxdoBn';

        const message = buildMessageWithAnchor(link);
        const iframe = buildSpotifyIframe(link, partial_link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });

      it('renders a track with params', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const link =
          'https://play.spotify.com/track/5yEPxDjbbzUzyauGtnmVEC?play=true&utm_source=open.spotify.com&utm_medium=open';
        const partial_link = 'track/5yEPxDjbbzUzyauGtnmVEC';

        const message = buildMessageWithAnchor(link);
        const iframe = buildSpotifyIframe(link, partial_link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(iframe);
      });
    });

    describe('Vimeo', () => {
      it('does not render a link with disabled config feature', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: false,
          },
        });
        const link = 'https://vimeo.com/27999954';

        const message = buildMessageWithAnchor(link);

        expect(new MediaParser().renderMediaEmbeds(message)).toBe(message);
      });

      it('renders a video', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const id = '27999954';
        const link = 'https://vimeo.com/27999954';

        const message = buildMessageWithAnchor(link);
        const iframe = buildVimeoIframe(link, id);

        expect(new MediaParser().renderMediaEmbeds(message, '#333')).toBe(iframe);
      });

      it("doesn't render a user's profile page", () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const message = buildMessageWithAnchor('https://vimeo.com/user38597062');

        expect(new MediaParser().renderMediaEmbeds(message, '#333')).toBe(message);
      });

      it('renders a link with params', () => {
        spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
          FEATURE: {
            ENABLE_MEDIA_EMBEDS: true,
          },
        });
        const id = '127053285';
        const link = 'https://vimeo.com/channels/staffpicks/127053285?utm_source=social&utm_campaign=9914';

        const message = buildMessageWithAnchor(link);
        const iframe = buildVimeoIframe(link, id);

        expect(new MediaParser().renderMediaEmbeds(message, '#333')).toBe(iframe);
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
      expect(MediaEmbeds.convertYouTubeTimestampToSeconds(undefined)).toBe(0);
    });
  });
});
