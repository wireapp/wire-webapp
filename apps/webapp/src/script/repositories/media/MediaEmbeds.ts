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

import {formatString} from 'Util/StringUtil';

import {Runtime} from '@wireapp/commons';

interface IFrameOptions {
  allowfullscreen: string;
  class: string;
  frameborder: string;
  height: string;
  src?: string;
  type: string;
  video: boolean;
  width: string;
}

/**
 * Create an iFrame.
 * @param options Settings to be used to create the iFrame
 * @returns HTML string
 */
const _createIFrameContainer = (options?: Partial<IFrameOptions>): string => {
  const defaults = {
    allowfullscreen: ' allowfullscreen',
    class: 'iframe-container iframe-container-video',
    frameborder: '0',
    height: '100%',
    type: 'default',
    video: true,
    width: '100%',
  };

  options = {...defaults, ...options};
  const iFrameContainer = `<div class="{0}"><iframe class="${options.type}" width="{1}" height="{2}" src="{3}" frameborder="{4}"{5}></iframe></div>`;

  if (!options.video) {
    options.allowfullscreen = '';
    options.class = 'iframe-container';
  }

  if (Runtime.isDesktopApp()) {
    options.allowfullscreen = '';
  }

  return formatString(
    iFrameContainer,
    options.class,
    options.width,
    options.height,
    options.src,
    options.frameborder,
    options.allowfullscreen,
  );
};

/**
 * Appends an iFrame.
 *
 * @param link Link element
 * @param message Message containing the link
 * @param iFrame HTML text of the iFrame
 * @returns Message content
 */
const _appendIFrame = (link: HTMLAnchorElement, message: string, iFrame: string): string => {
  const linkString = link.outerHTML.replace(/&amp;/g, '&');
  return message.replace(/&amp;/g, '&').replace(linkString, `${linkString}${iFrame}`);
};

/**
 * Find search parameters in a string
 *
 * @param params String where we should find the parameters
 */
const _getParameters = (params: string): string => params.slice(params.indexOf('?')).replace(/^\?/, '');

/**
 * Generate embedded YouTube URL to use as source in iFrames
 *
 * @param url Given YouTube URL
 * @returns YouTube embed URL
 */
const generateYouTubeEmbedUrl = (url: string): string | void => {
  if (url.match(MediaEmbeds.regex.youtube)) {
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
    searchParams.set('html5', '1');

    searchParams.set('enablejsapi', '0');
    searchParams.set('modestbranding', '1');

    // Do not get related videos at the end
    searchParams.set('rel', '0');

    // Convert the timestamp into an embed friendly format (start=seconds)
    if (searchParams.has('t')) {
      searchParams.set('start', convertYouTubeTimestampToSeconds(searchParams.get('t')).toString());
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
 * Converts YouTube timestamp into seconds
 *
 * @param timestamp YouTube timestamp (e.g. "1h8m55s")
 * @returns Timestamp in seconds
 */
const convertYouTubeTimestampToSeconds = (timestamp: string): number => {
  if (timestamp) {
    if (/^[0-9]*$/.test(timestamp)) {
      return parseInt(timestamp, 10);
    }

    const _extractUnit = (unit: 'h' | 'm' | 's'): number => {
      const extracted = (timestamp.match(new RegExp(`([0-9]+)(?=${unit})`)) || ['0'])[0];
      return parseInt(extracted, 10);
    };

    return _extractUnit('h') * 3600 + _extractUnit('m') * 60 + _extractUnit('s');
  }
  return 0;
};

// Make public for testability.
export const MediaEmbeds = {
  convertYouTubeTimestampToSeconds,
  generateYouTubeEmbedUrl,
  regex: {
    // example: http://regexr.com/3ase5
    soundcloud: /(https?:\/\/(?:www\.|m\.)?)?soundcloud\.com(\/[\w-]+){2,3}/g,
    spotify: /https?:\/\/(?:play\.|open\.)*spotify\.com\/([^?]+)/g,
    vimeo: /https?:\/\/(?:(?:player\.)?vimeo\.com\/)(?:channels(?:\/[^/]+)?\/|video\/)?([0-9]+)/g,
    youtube:
      /(?:youtube(?:-nocookie)?\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/g,
  },

  /**
   * Appends SoundCloud iFrame if link is a valid SoundCloud source.
   *
   * @param link Link element
   * @param message Message containing the link
   * @returns Message with appended iFrame
   */
  soundcloud(link: HTMLAnchorElement, message: string): string {
    let linkSrc = link.href;

    if (linkSrc.match(MediaEmbeds.regex.soundcloud)) {
      linkSrc = linkSrc.replace(/(m\.)/, '');
      let linkPathName = link.pathname;

      if (linkPathName.endsWith('/')) {
        linkPathName = linkPathName.slice(0, -1);
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

      const iFrame = _createIFrameContainer({
        height: height.toString(),
        src: 'https://w.soundcloud.com/player/?url={1}&visual=false&show_comments=false&buying=false&show_playcount=false&liking=false&sharing=false&hide_related=true',
        type: 'soundcloud',
        video: false,
      });

      const embed = formatString(iFrame, height, linkSrc);
      message = _appendIFrame(link, message, embed);
    }

    return message;
  },

  /**
   * Appends Spotify iFrame if link is a valid Spotify source.
   *
   * @param link Link element
   * @param message Message containing the link
   * @returns Message with appended iFrame
   */
  spotify(link: HTMLAnchorElement, message: string): string {
    const linkSrc = link.href;

    if (linkSrc.match(MediaEmbeds.regex.spotify)) {
      const iFrame = _createIFrameContainer({
        height: '80px',
        src: 'https://embed.spotify.com/?uri=spotify$1',
        type: 'spotify',
        video: false,
      });

      // convert spotify uri: album/23... -> album:23... -> album%3A23...
      let embed = '';
      linkSrc.replace(MediaEmbeds.regex.spotify, (match, group1) => {
        const replaceSlashes = group1.replace(/\//g, ':');
        const encodedParams = encodeURIComponent(`:${replaceSlashes}`);
        return (embed = iFrame.replace('$1', encodedParams));
      });

      message = _appendIFrame(link, message, embed);
    }

    return message;
  },

  /**
   * Appends Vimeo iFrame if link is a valid Vimeo source.
   *
   * @param link Link element
   * @param message Message containing the link
   * @param themeColor User color
   * @returns Message with appended iFrame
   */
  vimeo(link: HTMLAnchorElement, message: string, themeColor: string): string {
    const linkSrc = link.href;
    const vimeoColor = themeColor ? themeColor.replace('#', '') : undefined;

    if (linkSrc.match(MediaEmbeds.regex.vimeo)) {
      const iFrame = _createIFrameContainer({
        src: `https://player.vimeo.com/video/$1?portrait=0&color=${vimeoColor}&badge=0`,
        type: 'vimeo',
      });

      let embed = '';
      linkSrc.replace(MediaEmbeds.regex.vimeo, (match, group1) => (embed = iFrame.replace('$1', group1)));

      message = _appendIFrame(link, message, embed);
    }

    return message;
  },

  /**
   * Appends YouTube iFrame if link is a valid YouTube source.
   *
   * @param link Link element
   * @param message Message containing the link
   * @returns Message with appended iFrame
   */
  youtube(link: HTMLAnchorElement, message: string): string {
    const embedUrl = generateYouTubeEmbedUrl(link.href);

    if (embedUrl) {
      const iFrame = _createIFrameContainer({
        src: embedUrl,
        type: 'youtube',
      });

      message = _appendIFrame(link, message, iFrame);
      return message;
    }

    return message;
  },
};
