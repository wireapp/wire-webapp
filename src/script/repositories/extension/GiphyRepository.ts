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

import type {GiphyService} from './GiphyService';

import {Logger, getLogger} from '../../util/Logger';

export interface Gif {
  animated: string;
  static: string;
  url: string;
  title?: string;
}

export interface RandomGifOptions {
  /** How many retries to get the correct size. Default is `3`. */
  maxRetries?: number;
  /** Maximum GIF size in bytes. */
  maxSize?: number;
  /** Search query term or phrase */
  tag: string;
}

export interface GetGifOptions {
  maxResults: number;
  /** Maximum GIF size in bytes. Default is 3 Megabytes. */
  maxSize: number;
}

export class GiphyRepository {
  private readonly giphyService: GiphyService;
  private readonly logger: Logger;
  private currentOffset: number;

  static CONFIG = {
    MAX_RESULTS: 6,
    MAX_RETRIES: 3,
    // 3MB
    MAX_SIZE: 3 * 1024 * 1024,
  };

  constructor(giphyService: GiphyService) {
    this.giphyService = giphyService;
    this.logger = getLogger('GiphyRepository');
    this.resetOffset();
  }

  resetOffset(): void {
    this.currentOffset = 0;
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
      throw new Error(`Unable to fetch a proper GIF within ${options.maxRetries} retries`);
    }

    const {data: randomGif} = await this.giphyService.getRandom(options.tag);
    if (!randomGif.id) {
      throw new Error(`Could not find any GIF with tag '${options.tag}'`);
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
  async getGifs(query: string, options?: GetGifOptions): Promise<Gif[]> {
    options = {
      maxResults: GiphyRepository.CONFIG.MAX_RESULTS,
      maxSize: GiphyRepository.CONFIG.MAX_SIZE,
      ...options,
    };

    if (!query) {
      const error = new Error('No query specified');
      this.logger.error(error.message, error);
      throw error;
    }

    try {
      const {data: gifs, pagination} = await this.giphyService.getSearch({
        // we need more GIFs in the cache to be able to filter out too large GIFs
        limit: 100,
        offset: this.currentOffset,
        q: query,
      });

      // reset the offset to 0 when we received the maximum of results
      this.currentOffset = this.currentOffset < pagination.total_count - 6 ? this.currentOffset + 6 : 0;

      const result = [];

      for (const {images, url, caption} of gifs) {
        const staticGif = images.fixed_width_still;
        const animatedGif = images.downsized;
        const exceedsMaxSize = parseInt(animatedGif.size, 10) > options.maxSize;

        if (!exceedsMaxSize) {
          result.push({
            animated: animatedGif.url,
            static: staticGif.url,
            title: caption,
            url,
          });
        }

        if (result.length === options.maxResults) {
          break;
        }
      }

      return result;
    } catch (error) {
      this.logger.warn(`Unable to fetch GIF for query: ${query}`, error);
      throw error;
    }
  }
}
