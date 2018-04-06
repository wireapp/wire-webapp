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

'use strict';

window.z = window.z || {};
window.z.extension = z.extension || {};

z.extension.GiphyRepository = class GiphyRepository {
  static get CONFIG() {
    return {
      MAX_RETRIES: 3,
      MAX_SIZE: 3 * 1024 * 1024, // 3MB
      NUMBER_OF_RESULTS: 6,
    };
  }

  /**
   * Construct a new Giphy Repository.
   * @param {z.extension.GiphyService} giphyService - Giphy REST API implementation
   */
  constructor(giphyService) {
    this.giphyService = giphyService;
    this.logger = new z.util.Logger('z.extension.GiphyRepository', z.config.LOGGER.OPTIONS);
    this.gifQueryCache = {};
  }

  /**
   * Get random GIF for a word or phrase.
   *
   * @param {Object} options - Search options
   * @param {string} options.tag - Search query term or phrase
   * @param {number} [options.retry=3] - How many retries to get the correct size
   * @param {number} [options.max_size=3MB] - Maximum gif size in bytes
   * @returns {Promise} Resolves with a random matching gif
   */
  getRandomGif(options) {
    options = $.extend(
      {
        maxRetries: GiphyRepository.CONFIG.MAX_RETRIES,
        maxSize: GiphyRepository.CONFIG.MAX_SIZE,
      },
      options
    );

    const _getRandomGif = (retry = 0) => {
      const hasReachedRetryLimit = retry >= options.maxRetries;
      if (hasReachedRetryLimit) {
        throw new Error(`Unable to fetch a proper gif within ${options.maxRetries} retries`);
      }

      return this.giphyService
        .getRandom(options.tag)
        .then(({data: randomGif}) => this.giphyService.getById(randomGif.id))
        .then(({data: {images, url}}) => {
          const staticGif = images[z.extension.GiphyContentSizes.FIXED_WIDTH_STILL];
          const animatedGif = images[z.extension.GiphyContentSizes.DOWNSIZED];

          const exceedsMaxSize = animatedGif.size > options.maxSize;
          if (exceedsMaxSize) {
            this.logger.info(`Gif size (${animatedGif.size}) is over maximum size (${animatedGif.size})`);
            return _getRandomGif(retry + 1);
          }

          return {
            animated: animatedGif.url,
            static: staticGif.url,
            url: url,
          };
        });
    };

    return _getRandomGif();
  }

  /**
   * Get random GIFs for a word or phrase.
   *
   * @param {Object} options - Search options
   * @param {string} options.query - Search query term or phrase
   * @param {number} options.number - Amount of GIFs to retrieve
   * @param {number} [options.max_size=3MB] - Maximum gif size in bytes
   * @param {boolean} [options.random=true] - Will return an randomized result
   * @param {string} [options.sorting='recent'] - Specify sorting ('relevant' or 'recent')
   * @returns {Promise} Resolves with gifs
   */
  getGifs(options) {
    let offset = 0;

    options = $.extend(
      {
        maxSize: GiphyRepository.CONFIG.MAX_SIZE,
        random: true,
        results: GiphyRepository.CONFIG.NUMBER_OF_RESULTS,
        sorting: 'relevant',
      },
      options
    );

    if (!options.query) {
      const error = new Error('No query specified');
      this.logger.error(error.message, error);
      throw error;
    }

    if (options.random) {
      options.sorting = z.util.ArrayUtil.randomElement(['recent', 'relevant']);

      const total = this.gifQueryCache[options.query];
      if (total) {
        const resultExceedsTotal = options.results >= total;
        offset = resultExceedsTotal ? 0 : Math.floor(Math.random() * total - options.number);
      }
    }

    return this.giphyService
      .getSearch({
        limit: 100,
        offset: offset,
        // eslint-disable-next-line id-length
        q: options.query,
        sort: options.sorting,
      })
      .then(({data: gifs, pagination}) => {
        const result = [];

        if (options.random) {
          gifs = gifs.sort(() => 0.5 - Math.random());
        }

        this.gifQueryCache[options.query] = pagination.total_count;

        for (const {images, url} of gifs.slice(0, options.number)) {
          const staticGif = images[z.extension.GiphyContentSizes.FIXED_WIDTH_STILL];
          const animatedGif = images[z.extension.GiphyContentSizes.DOWNSIZED];

          const exceedsMaxSize = animatedGif.size > options.maxSize;
          if (!exceedsMaxSize) {
            result.push({
              animated: animatedGif.url,
              static: staticGif.url,
              url: url,
            });
          }
        }

        return result;
      })
      .catch(error => {
        this.logger.info(`Unable to fetch gif for query: ${options.query}`, error);
        throw error;
      });
  }
};
