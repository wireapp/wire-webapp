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
import type {GiphyService} from './GiphyService';

export interface Gif {
  animated: string;
  static: string;
  url: string;
}

export interface RandomGifOptions {
  /** How many retries to get the correct size. Default is `3`. */
  maxRetries?: number;
  /** Maximum gif size in bytes. Default is 3 megabytes. */
  maxSize?: number;
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
  /**  Will return a randomized result. Default is `true`. */
  random?: boolean;
  results?: number;
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

  constructor(giphyService: GiphyService) {
    this.giphyService = giphyService;
    this.logger = getLogger('GiphyRepository');
    this.gifQueryCache = {};
  }

  /**
   * Get random GIF for a word or phrase.
   */
  async getRandomGif(options: RandomGifOptions, retry: number = 0): Promise<Gif> {
    options = {
      maxRetries: GiphyRepository.CONFIG.MAX_RETRIES,
      maxSize: GiphyRepository.CONFIG.MAX_SIZE,
      ...options,
    };

    const hasReachedRetryLimit = retry >= options.maxRetries;
    if (hasReachedRetryLimit) {
      throw new Error(`Unable to fetch a proper gif within ${options.maxRetries} retries`);
    }

    const {data: randomGif} = await this.giphyService.getRandom(options.tag);
    if (!randomGif.id) {
      throw new Error(`Could not find any gif with tag '${options.tag}'`);
    }
    const {
      data: {images, url},
    } = await this.giphyService.getById(randomGif.id);
    const staticGif = images.fixed_width_still;
    const animatedGif = images.downsized;
    const exceedsMaxSize = window.parseInt(animatedGif.size, 10) > options.maxSize;

    if (exceedsMaxSize) {
      this.logger.info(`Gif size (${animatedGif.size}) is over maximum size (${animatedGif.size})`);
      return this.getRandomGif(options, retry + 1);
    }

    return {
      animated: animatedGif.url,
      static: staticGif.url,
      url: url,
    };
  }

  /**
   * Get random GIFs for a word or phrase.
   */
  async getGifs(options: GetGifOptions): Promise<Gif[]> {
    let offset = 0;

    options = {
      maxSize: GiphyRepository.CONFIG.MAX_SIZE,
      random: true,
      results: GiphyRepository.CONFIG.NUMBER_OF_RESULTS,
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

    try {
      const {data: gifs, pagination} = await this.giphyService.getSearch({
        limit: 100,
        offset,
        q: options.query,
      });

      const result = [];

      if (options.random) {
        gifs.sort(() => 0.5 - Math.random());
      }

      this.gifQueryCache[options.query] = pagination.total_count;

      for (const {images, url} of gifs.slice(0, options.number)) {
        const staticGif = images.fixed_width_still;
        const animatedGif = images.downsized;
        const exceedsMaxSize = parseInt(animatedGif.size, 10) > options.maxSize;

        if (!exceedsMaxSize) {
          result.push({
            animated: animatedGif.url,
            static: staticGif.url,
            url,
          });
        }
      }

      return result;
    } catch (error) {
      this.logger.info(`Unable to fetch gif for query: ${options.query}`, error);
      throw error;
    }
  }
}
