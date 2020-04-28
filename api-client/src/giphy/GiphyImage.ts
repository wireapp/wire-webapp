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

export interface ImageDimensions {
  height: string;
  width: string;
}

export interface ImageMP4Meta {
  mp4: string;
  mp4_size: string;
}

export interface ImageGifMeta {
  size: string;
  url: string;
}

export interface ImageWebPMeta {
  webp: string;
  webp_size: string;
}

export interface GiphyImage {
  caption: string;
  fixed_height_downsampled_height: string;
  fixed_height_downsampled_url: string;
  fixed_height_downsampled_width: string;
  fixed_height_small_height: string;
  fixed_height_small_still_url: string;
  fixed_height_small_url: string;
  fixed_height_small_width: string;
  fixed_width_downsampled_height: string;
  fixed_width_downsampled_url: string;
  fixed_width_downsampled_width: string;
  fixed_width_small_height: string;
  fixed_width_small_still_url: string;
  fixed_width_small_url: string;
  fixed_width_small_width: string;
  id: string;
  image_frames: string;
  image_height: string;
  image_mp4_url: string;
  image_original_url: string;
  image_url: string;
  image_width: string;
  images: {
    downsized: ImageDimensions & ImageGifMeta;
    downsized_large: ImageDimensions & ImageGifMeta;
    downsized_medium: ImageDimensions & ImageGifMeta;
    downsized_small: ImageDimensions & ImageMP4Meta;
    downsized_still: ImageDimensions & ImageGifMeta;
    fixed_height: ImageDimensions & ImageWebPMeta & ImageGifMeta & ImageMP4Meta;
    fixed_height_downsampled: ImageDimensions & ImageWebPMeta & ImageGifMeta;
    fixed_height_small: ImageDimensions & ImageWebPMeta & ImageGifMeta & ImageMP4Meta;
    fixed_height_small_still: ImageDimensions & ImageGifMeta;
    fixed_height_still: ImageDimensions & ImageGifMeta;
    fixed_width: ImageDimensions & ImageWebPMeta & ImageGifMeta & ImageMP4Meta;
    fixed_width_downsampled: ImageDimensions & ImageWebPMeta & ImageGifMeta;
    fixed_width_small: ImageDimensions & ImageWebPMeta & ImageGifMeta & ImageMP4Meta;
    fixed_width_small_still: ImageDimensions & ImageGifMeta;
    fixed_width_still: ImageDimensions & ImageGifMeta;
    hd: ImageDimensions & ImageMP4Meta;
    looping: ImageMP4Meta;
    original: {frames: string; hash: string} & ImageDimensions & ImageWebPMeta & ImageGifMeta & ImageMP4Meta;
    original_mp4: ImageDimensions & ImageMP4Meta;
    original_still: ImageDimensions & ImageGifMeta;
    preview: ImageDimensions & ImageMP4Meta;
    preview_gif: ImageDimensions & ImageGifMeta;
    preview_webp: ImageDimensions & ImageGifMeta;
  };
  type: string;
  url: string;
  username: string;
}
