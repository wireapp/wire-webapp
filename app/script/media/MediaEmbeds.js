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

window.z = window.z || {};
window.z.media = z.media || {};

z.media.MediaEmbeds = (function() {

  /**
   * Create and iframe.
   * @private
   * @param {Object} options - Settings to be used to create the iframe
   * @returns {string} HTML string
   */
  const _create_iframe_container = function(options) {
    const defaults = {
      allowfullscreen: ' allowfullscreen',
      class: 'iframe-container iframe-container-video',
      frameborder: '0',
      height: '100%',
      type: 'default',
      video: true,
      width: '100%',
    };

    options = _.extend(defaults, options);
    const iframe_container = `<div class="{0}"><iframe class="${options.type}" width="{1}" height="{2}" src="{3}" frameborder="{4}"{5}></iframe></div>`;

    if (!options.video) {
      options.allowfullscreen = '';
      options.class = 'iframe-container';
    }

    if (z.util.Environment.electron) {
      options.allowfullscreen = '';
    }

    return z.util.StringUtil.format(iframe_container, options.class, options.width, options.height, options.src, options.frameborder, options.allowfullscreen);
  };

  // Enum of different regex for the supported services.
  const _regex = {
    // example: http://regexr.com/3ase5
    youtube: /.*(?:youtu.be|youtube.com).*(?:\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/g,
    soundcloud: /(https?:\/\/(?:www\.|m\.)?)?soundcloud\.com(\/[\w\-]+){2,3}/g,
    spotify: /https?:\/\/(?:play\.|open\.)*spotify.com\/([\w\-/]+)/g,
    vimeo: /https?:\/\/(?:vimeo\.com\/|player\.vimeo\.com\/)(?:video\/|(?:channels\/staffpicks\/|channels\/)|)((\w|-){7,9})/g,
  };

  /**
   * Appends an iFrame.
   *
   * @private
   * @param {HTMLAnchorElement} link - Link element
   * @param {String} message - Message containing the link
   * @param {string} iframe - HTML of iframe
   * @returns {string} Message content
   */
  const _append_iframe = function(link, message, iframe) {
    const link_string = link.outerHTML.replace(/&amp;/g, '&');
    return message
      .replace(/&amp;/g, '&')
      .replace(link_string, `${link_string}${iframe}`);
  };

  /**
   * Generate embed URL to use as src in iframes
   *
   * @private
   * @param {string} url - Given youtube url
   * @returns {string} Youtube embed URL
  */
  const _generate_youtube_embed_url = function(url) {
    if (url.match(/youtu.be|youtube.com/)) {

      const video_id = url.match(/(?:embed\/|v=|v\/|be\/)([a-zA-Z0-9_-]{11})/);
      if (!video_id) return;

      // W have to remove the v param and convert the timestamp
      // into an embed friendly format (start=seconds)
      const query = url
        .substr(url.indexOf('?'), url.length)
        .replace(/^[?]/, '&')
        .replace(/[&]v=[a-zA-Z0-9_-]{11}/, '')
        .replace(/[&#]t=([a-z0-9]+)/, (a, b) => `&start=${_convert_youtube_timestamp_to_seconds(b)}`)
        .replace(/[&]?autoplay=1/, ''); // remove autoplay param

      // append html5 parameter to youtube src to force html5 mode
      // this fixes the issue that FF displays black box in some cases
      return `https://www.youtube.com/embed/${video_id[1]}?html5=1${query}`;
    }
  };

  /**
   * Converts youtube timestamp into seconds
   *
   * @private
   * @param {string} timestamp - Youtube timestamp (1h8m55s)
   * @returns {Number} Timestamp in seconds
   */
  const _convert_youtube_timestamp_to_seconds = function(timestamp) {
    if (timestamp) {
      if (/^[0-9]*$/.test(timestamp)) {
        return window.parseInt(timestamp, 10);
      }

      const _extract_unit = function(unit) {
        return window.parseInt((timestamp.match(new RegExp(`([0-9]+)(?=${unit})`)) || [0])[0], 10);
      };

      return (_extract_unit('h') * 3600) + (_extract_unit('m') * 60) + (_extract_unit('s'));
    }
    return 0;
  };

  // Make public for testability.
  return {
    regex: _regex,
    generate_youtube_embed_url: _generate_youtube_embed_url,
    convert_youtube_timestamp_to_seconds: _convert_youtube_timestamp_to_seconds,

    /**
     * Appends SoundCloud iFrame if link is a valid SoundCloud source.
     *
     * @param {HTMLAnchorElement} link - Link element
     * @param {string} message - Message containing the link
     * @returns {string} Message with appended iFrame
     */
    soundcloud(link, message) {
      let link_src = link.href;

      if (link_src.match(_regex.soundcloud)) {
        link_src = link_src.replace(/(m\.)/, '');
        let link_path_name = link.pathname;

        if (link_path_name.endsWith('/')) {
          link_path_name = link_path_name.substr(0, link_path_name.length - 1);
        }

        let is_single_track = false;
        const slashes_in_link = link_path_name.split('/').length;

        if (slashes_in_link === 3) {
          is_single_track = true;
        } else if ((slashes_in_link > 3) && (link_path_name.indexOf('sets') === -1)) {
          // Fix for WEBAPP-1137
          return message;
        }

        const height = is_single_track ? 164 : 465;

        const iframe = _create_iframe_container({
          src: 'https://w.soundcloud.com/player/?url={1}&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true',
          type: 'soundcloud',
          video: false,
          height: height,
        });

        const embed = z.util.StringUtil.format(iframe, height, link_src);
        message = _append_iframe(link, message, embed);
      }

      return message;
    },

    /**
     * Appends Spotify iFrame if link is a valid Spotify source.
     *
     * @param {HTMLAnchorElement} link - Link element
     * @param {string} message - Message containing the link
     * @returns {string} Message with appended iFrame
     */
    spotify(link, message) {
      const link_src = link.href;

      if (link_src.match(_regex.spotify)) {
        const iframe = _create_iframe_container({
          src: 'https://embed.spotify.com/?uri=spotify$1',
          type: 'spotify',
          video: false,
          height: '80px',
        });

        // convert spotify uri: album/23... -> album:23... -> album%3A23...
        let embed = '';
        link_src.replace(_regex.spotify, function(match, group1) {
          const replace_slashes = group1.replace(/\//g, ':');
          const encoded_params = encodeURIComponent(`:${replace_slashes}`);
          return embed = iframe.replace('$1', encoded_params);
        });

        message = _append_iframe(link, message, embed);
      }

      return message;
    },

    /**
     * Appends Vimeo iFrame if link is a valid Vimeo source.
     *
     * @param {HTMLAnchorElement} link - Link element
     * @param {string} message - Message containing the link
     * @param {string} theme_color - User color
     * @returns {string} Message with appended iFrame
     */
    vimeo(link, message, theme_color) {
      const link_src = link.href;
      const vimeo_color = theme_color ? theme_color.replace('#', '') : undefined;

      if (link_src.match(_regex.vimeo)) {
        if (z.util.StringUtil.includes(link_src, '/user')) return message;

        const iframe = _create_iframe_container({
          src: `https://player.vimeo.com/video/$1?portrait=0&color=${vimeo_color}&badge=0`,
          type: 'vimeo',
        });

        let embed = '';
        link_src.replace(_regex.vimeo, (match, group1) => embed = iframe.replace('$1', group1));

        message = _append_iframe(link, message, embed);
      }

      return message;
    },

    /**
     * Appends YouTube iFrame if link is a valid YouTube source.
     *
     * @param {HTMLAnchorElement} link - Link element
     * @param {string} message - Message containing the link
     * @returns {string} Message with appended iFrame
     */
    youtube(link, message) {
      const embed_url = _generate_youtube_embed_url(link.href);

      if (embed_url) {
        const iframe = _create_iframe_container({
          src: embed_url,
          type: 'youtube',
        });

        message = _append_iframe(link, message, iframe);
        return message;
      }

      return message;
    },
  };
})();
