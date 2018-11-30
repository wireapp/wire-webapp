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

/* eslint-disable no-unused-vars */
import urlSearchParamPolyfill from 'url-search-params-polyfill';
/* eslint-enable no-unused-vars */

window.z = window.z || {};
window.z.media = z.media || {};

z.media.MediaEmbeds = (function() {
  /**
   * Create and iframe.
   * @private
   * @param {Object} options - Settings to be used to create the iframe
   * @returns {string} HTML string
   */
  const _createIframeContainer = options => {
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
    const iframeContainer = `<div class="{0}"><iframe class="${
      options.type
    }" width="{1}" height="{2}" src="{3}" frameborder="{4}"{5}></iframe></div>`;

    if (!options.video) {
      options.allowfullscreen = '';
      options.class = 'iframe-container';
    }

    if (z.util.Environment.desktop) {
      options.allowfullscreen = '';
    }

    return z.util.StringUtil.format(
      iframeContainer,
      options.class,
      options.width,
      options.height,
      options.src,
      options.frameborder,
      options.allowfullscreen
    );
  };

  // Enum of different regex for the supported services.
  const _regex = {
    // example: http://regexr.com/3ase5
    soundcloud: /(https?:\/\/(?:www\.|m\.)?)?soundcloud\.com(\/[\w-]+){2,3}/g,
    spotify: /https?:\/\/(?:play\.|open\.)*spotify\.com\/([^?]+)/g,
    vimeo: /https?:\/\/(?:(?:player\.)?vimeo\.com\/)(?:channels(?:\/[^/]+)?\/|video\/)?([0-9]+)/g,
    youtube: /(?:youtube(?:-nocookie)?\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/g,
  };

  /**
   * Appends an iFrame.
   *
   * @private
   * @param {HTMLAnchorElement} link - Link element
   * @param {string} message - Message containing the link
   * @param {string} iframe - HTML of iframe
   * @returns {string} Message content
   */
  const _appendIframe = (link, message, iframe) => {
    const linkString = link.outerHTML.replace(/&amp;/g, '&');
    return message.replace(/&amp;/g, '&').replace(linkString, `${linkString}${iframe}`);
  };

  /**
   * Find search parameters in a string
   *
   * @private
   * @param {string} params - String where we should find the parameters
   * @returns {string} Parameters
   */
  const _getParameters = params => params.substr(params.indexOf('?'), params.length).replace(/^\?/, '');

  /**
   * Generate embed URL to use as src in iframes
   *
   * @private
   * @param {string} url - Given youtube url
   * @returns {string} Youtube embed URL
   */
  const _generateYouTubeEmbedUrl = url => {
    if (url.match(_regex.youtube)) {
      const videoId = url.match(/(?:embed\/|v=|v\/|be\/)([a-zA-Z0-9_-]{11})/);
      if (!videoId) {
        return;
      }

      // Extract params from the URL
      const parser = document.createElement('a');
      parser.href = url;
      const searchParams = new URLSearchParams([_getParameters(parser.search), _getParameters(parser.hash)].join('&'));

      // Append HTML5 parameter to YouTube src to force HTML5 mode
      // This fixes the issue that FF displays black box in some cases
      searchParams.set('html5', 1);

      searchParams.set('enablejsapi', 0);
      searchParams.set('modestbranding', 1);

      // Do not get related videos at the end
      searchParams.set('rel', 0);

      // Convert the timestamp into an embed friendly format (start=seconds)
      if (searchParams.has('t')) {
        searchParams.set('start', _convertYouTubeTimestampToSeconds(searchParams.get('t')));
        searchParams.delete('t');
      }

      // Remove some parameters
      searchParams.delete('autoplay');
      searchParams.delete('v');
      searchParams.delete('widget_referrer');
      searchParams.delete('showinfo');

      return `https://www.youtube-nocookie.com/embed/${videoId[1]}?${searchParams.toString()}`;
    }
  };

  /**
   * Converts youtube timestamp into seconds
   *
   * @private
   * @param {string} timestamp - Youtube timestamp (1h8m55s)
   * @returns {number} Timestamp in seconds
   */
  const _convertYouTubeTimestampToSeconds = timestamp => {
    if (timestamp) {
      if (/^[0-9]*$/.test(timestamp)) {
        return window.parseInt(timestamp, 10);
      }

      const _extractUnit = unit => {
        return window.parseInt((timestamp.match(new RegExp(`([0-9]+)(?=${unit})`)) || [0])[0], 10);
      };

      return _extractUnit('h') * 3600 + _extractUnit('m') * 60 + _extractUnit('s');
    }
    return 0;
  };

  // Make public for testability.
  return {
    convertYouTubeTimestampToSeconds: _convertYouTubeTimestampToSeconds,
    generateYouTubeEmbedUrl: _generateYouTubeEmbedUrl,
    regex: _regex,

    /**
     * Appends SoundCloud iFrame if link is a valid SoundCloud source.
     *
     * @param {HTMLAnchorElement} link - Link element
     * @param {string} message - Message containing the link
     * @returns {string} Message with appended iFrame
     */
    soundcloud(link, message) {
      let linkSrc = link.href;

      if (linkSrc.match(_regex.soundcloud)) {
        linkSrc = linkSrc.replace(/(m\.)/, '');
        let linkPathName = link.pathname;

        if (linkPathName.endsWith('/')) {
          linkPathName = linkPathName.substr(0, linkPathName.length - 1);
        }

        let isSingleTrack = false;
        const slashesInLink = linkPathName.split('/').length;

        if (slashesInLink === 3) {
          isSingleTrack = true;
        } else if (slashesInLink > 3 && linkPathName.indexOf('sets') === -1) {
          // Fix for WEBAPP-1137
          return message;
        }

        const height = isSingleTrack ? 164 : 465;

        const iframe = _createIframeContainer({
          height: height,
          src:
            'https://w.soundcloud.com/player/?url={1}&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true',
          type: 'soundcloud',
          video: false,
        });

        const embed = z.util.StringUtil.format(iframe, height, linkSrc);
        message = _appendIframe(link, message, embed);
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
      const linkSrc = link.href;

      if (linkSrc.match(_regex.spotify)) {
        const iframe = _createIframeContainer({
          height: '80px',
          src: 'https://embed.spotify.com/?uri=spotify$1',
          type: 'spotify',
          video: false,
        });

        // convert spotify uri: album/23... -> album:23... -> album%3A23...
        let embed = '';
        linkSrc.replace(_regex.spotify, (match, group1) => {
          const replaceSlashes = group1.replace(/\//g, ':');
          const encodedParams = window.encodeURIComponent(`:${replaceSlashes}`);
          return (embed = iframe.replace('$1', encodedParams));
        });

        message = _appendIframe(link, message, embed);
      }

      return message;
    },

    /**
     * Appends Vimeo iFrame if link is a valid Vimeo source.
     *
     * @param {HTMLAnchorElement} link - Link element
     * @param {string} message - Message containing the link
     * @param {string} themeColor - User color
     * @returns {string} Message with appended iFrame
     */
    vimeo(link, message, themeColor) {
      const linkSrc = link.href;
      const vimeoColor = themeColor ? themeColor.replace('#', '') : undefined;

      if (linkSrc.match(_regex.vimeo)) {
        const iframe = _createIframeContainer({
          src: `https://player.vimeo.com/video/$1?portrait=0&color=${vimeoColor}&badge=0`,
          type: 'vimeo',
        });

        let embed = '';
        linkSrc.replace(_regex.vimeo, (match, group1) => (embed = iframe.replace('$1', group1)));

        message = _appendIframe(link, message, embed);
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
      const embedUrl = _generateYouTubeEmbedUrl(link.href);

      if (embedUrl) {
        const iframe = _createIframeContainer({
          src: embedUrl,
          type: 'youtube',
        });

        message = _appendIframe(link, message, iframe);
        return message;
      }

      return message;
    },
  };
})();
