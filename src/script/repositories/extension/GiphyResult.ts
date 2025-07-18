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

interface GiphyImageStill {
  height: string;
  url: string;
  width: string;
}

interface GiphyImageDownsized extends GiphyImageStill {
  size: string;
}

interface GiphyImageDownsizedWebp extends GiphyImageDownsized {
  webp: string;
  webp_size: string;
}

interface GiphyImageDownsizedMp4 extends GiphyImageDownsizedWebp {
  mp4: 'http://media2.giphy.com/media/FiGiRei2ICzzG/200.mp4';
  mp4_size: '13866';
}

/**
 * @see https://developers.giphy.com/docs/#images-object
 */
export interface GiphyImages {
  downsized: GiphyImageDownsized;
  downsized_large: GiphyImageDownsized;
  downsized_still: GiphyImageStill;
  fixed_height: GiphyImageDownsizedMp4;
  fixed_height_downsampled: GiphyImageDownsizedWebp;
  fixed_height_small: GiphyImageDownsizedWebp;
  fixed_height_small_still: GiphyImageStill;
  fixed_height_still: GiphyImageStill;
  fixed_width: GiphyImageDownsizedMp4;
  fixed_width_downsampled: GiphyImageDownsizedWebp;
  fixed_width_small: GiphyImageDownsizedWebp;
  fixed_width_small_still: GiphyImageStill;
  fixed_width_still: GiphyImageStill;
  original: GiphyImageDownsizedMp4 & {
    frames: string;
  };
  original_still: GiphyImageStill;
}

/**
 * @see https://developers.giphy.com/docs/#gif-object
 */
export interface GiphyGif {
  bitly_gif_url: string;
  bitly_url: string;
  caption: string;
  content_url: string;
  embed_url: string;
  id: string;
  images: GiphyImages;
  import_datetime: string;
  rating: string;
  slug: string;
  source: string;
  source_post_url: string;
  source_tld: string;
  title: string;
  trending_datetime: string;
  type: string;
  url: string;
  username: string;
}

export interface GiphyResult<T> {
  data: T;
  meta: {
    msg: string;
    status: number;
  };
  pagination: {
    count: number;
    offset: number;
    total_count: number;
  };
}
