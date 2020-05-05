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

import {Logger, getLogger} from '../util/Logger';
import {GiphyService} from './GiphyService';
import {GiphySorting} from '@wireapp/api-client/dist/giphy';

export interface Gif {
  animated: string;
  static: string;
  url: string;
}

export interface RandomGifOptions {
  /** Maximum gif size in bytes. Default is 3 megabytes. */
  maxSize?: number;
  /** How many retries to get the correct size. Default is 3. */
  maxRetries?: number;
  /** Search query term or phrase */
  tag: string;
}

export interface GetGifOptions {
  /** Maximum gif size in bytes. Default is 3 megabytes. */
  maxSize?: number;
  /**  Amount of GIFs to retrieve */
  number: number;
  /**  Search query term or phrase */
  query: string;
  results?: number;
  /**  Will return a randomized result. Default is `true`. */
  random?: boolean;
  /**  Specify sorting ('relevant' or 'recent'). Default is "relevant". */
  sorting: GiphySorting;
}

export class GiphyRepository {
  private readonly giphyService: GiphyService;
  private readonly logger: Logger;
  private readonly gifQueryCache: Record<string, number>;

  static CONFIG = {
    MAX_RETRIES: 3,
    MAX_SIZE: 3 * 1024 * 1024, // 3MB
    NUMBER_OF_RESULTS: 6,
  };

  /**
   * @param giphyService Giphy REST API implementation
   */
  constructor(giphyService: GiphyService) {
    this.giphyService = giphyService;
    this.logger = getLogger('GiphyRepository');
    this.gifQueryCache = {};
  }

  /**
   * Get random GIF for a word or phrase.
   */
  getRandomGif(options: RandomGifOptions): Promise<Gif> {
    options = {
      maxRetries: GiphyRepository.CONFIG.MAX_RETRIES,
      maxSize: GiphyRepository.CONFIG.MAX_SIZE,
      ...options,
    };

    const _getRandomGif = (retry = 0): Promise<Gif> => {
      const hasReachedRetryLimit = retry >= options.maxRetries;
      if (hasReachedRetryLimit) {
        throw new Error(`Unable to fetch a proper gif within ${options.maxRetries} retries`);
      }

      return this.giphyService
        .getRandom(options.tag)
        .then(({data: randomGif}) => {
          if (!randomGif.id) {
            throw new Error(`Could not find any gif with tag '${options.tag}'`);
          }
          return this.giphyService.getById(randomGif.id);
        })
        .then(({data: {images, url}}) => {
          const staticGif = images.fixed_width_still;
          const animatedGif = images.downsized;

          const exceedsMaxSize = window.parseInt(animatedGif.size, 10) > options.maxSize;
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
   */
  getGifs(options: GetGifOptions): Promise<Gif[]> {
    let offset = 0;

    options = {
      maxSize: GiphyRepository.CONFIG.MAX_SIZE,
      random: true,
      results: GiphyRepository.CONFIG.NUMBER_OF_RESULTS,
      sorting: GiphySorting.RELEVANT,
      ...options,
    };

    if (!options.query) {
      const error = new Error('No query specified');
      this.logger.error(error.message, error);
      throw error;
    }

    if (options.random) {
      const total = this.gifQueryCache[options.query];
      if (total) {
        const resultExceedsTotal = options.results >= total;
        offset = resultExceedsTotal ? 0 : Math.floor(Math.random() * (total - options.number));
      }
    }

    return this.giphyService
      .getSearch({
        limit: 100,
        offset: offset,
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
          const staticGif = images.fixed_width_still;
          const animatedGif = images.downsized;

          const exceedsMaxSize = window.parseInt(animatedGif.size, 10) > options.maxSize;
          if (!exceedsMaxSize) {
            result.push({
              animated: animatedGif.url,
              static: staticGif.url,
              url,
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
}
