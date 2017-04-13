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
window.z.entity = z.entity || {};

z.entity.Asset = (function() {

  /*
   Construct a new asset.

   @param id [String] Asset ID
   */
  function Asset(id) {
    this.id = id;
    this.key = '';
    this.type = '';
  }


  /*
   Check if asset is a medium image.

   @return [Boolean] Is asset of type medium image
   */

  Asset.prototype.is_image = function() {
    return this.type === z.assets.AssetType.IMAGE;
  };


  /*
   Check if asset is a text.

   @return [Boolean] Is asset of type text
   */

  Asset.prototype.is_text = function() {
    return this.type === z.assets.AssetType.TEXT;
  };


  /*
   Check if asset is a file.

   @return [Boolean] Is asset of type file
   */

  Asset.prototype.is_file = function() {
    return this.type === z.assets.AssetType.FILE && !this.is_video() && !this.is_audio();
  };


  /*
   Check if asset is a location.

   @return [Boolean] Is asset of type location
   */

  Asset.prototype.is_location = function() {
    return this.type === z.assets.AssetType.LOCATION;
  };


  /*
   Check if asset is a video.

   @return [Boolean] Is asset of type video
   */

  Asset.prototype.is_video = function() {
    var can_play, is_video_asset, ref;
    is_video_asset = this.type === z.assets.AssetType.FILE && ((ref = this.file_type) != null ? ref.startsWith('video') : void 0);
    if (is_video_asset) {
      can_play = document.createElement('video').canPlayType(this.file_type);
      if (can_play !== '') {
        return true;
      }
    }
    return false;
  };


  /*
   Check if asset is a audio.

   @return [Boolean] Is asset of type audio
   */

  Asset.prototype.is_audio = function() {
    var can_play, ref;
    if (this.type === z.assets.AssetType.FILE && ((ref = this.file_type) != null ? ref.startsWith('audio') : void 0)) {
      can_play = document.createElement('audio').canPlayType(this.file_type);
      if (can_play !== '') {
        return true;
      }
    }
    return false;
  };

  return Asset;

})();
