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

/** @see https://developers.giphy.com/docs/optional-settings/#rating */
export enum GIPHY_RATING {
  ALL_AGES_AND_PEOPLE = 'g',
  MILD_SUBSTANCE = 'pg-13',
  REQUIRE_PARENTAL_PREVIEW = 'pg',
  STRONG_LANGUAGE = 'r',
}

export interface GiphyBaseOptions {
  /** An ID/proxy for a specific user. */
  random_id?: string;
  /**
   * Filters results by specified rating.
   * Acceptable values include g, pg, pg-13, r.
   * If you do not specify a rating, you will receive results
   * from all possible ratings.
   */
  rating?: GIPHY_RATING;
}

/** @see https://developers.giphy.com/docs/api/endpoint#random */
export interface GiphyTrendingOptions extends GiphyBaseOptions {
  /** The maximum number of objects to return. (Default: `25`) */
  limit?: number;
  /** Specifies the starting position of the results. Defaults to `0`. */
  offset?: number;
}

/** @see https://developers.giphy.com/docs/api/endpoint/#search */
export interface GiphySearchOptions extends GiphyTrendingOptions {
  /**
   * Specify default language for regional content;
   * use a 2-letter ISO 639-1 language code.
   */
  lang?: string;
  /** Search query term or phrase */
  q: string;
}

/** @see https://developers.giphy.com/docs/api/endpoint#random */
export interface GiphyRandomOptions extends GiphyBaseOptions {
  /** Filters results by specified tag. */
  tag?: string;
}

/** @see https://developers.giphy.com/docs/api/endpoint#get-gif-by-id */
export interface GiphyIdOptions extends GiphyBaseOptions {
  /** Filters results by specified GIF IDs. */
  ids: string[];
}
