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

import ko from 'knockout';

import {noop} from 'Util/util';

import type {AssetTransferState} from '../../../assets/AssetTransferState';
import type {FileAsset} from '../../../entity/message/FileAsset';
import {AbstractAssetTransferStateTracker} from '../AbstractAssetTransferStateTracker';

import '../assetLoader';

interface Params {
  asset: FileAsset;
  cancel?: () => void;
  large: boolean;
  pause?: () => void;
  play?: () => void;
  src: HTMLMediaElement;
  transferState: ko.PureComputed<AssetTransferState>;
  uploadProgress: ko.PureComputed<number>;
}

class MediaButtonComponent extends AbstractAssetTransferStateTracker {
  private readonly mediaElement: HTMLMediaElement;
  private readonly large: boolean;
  readonly asset: FileAsset;
  private readonly isPlaying: ko.Observable<boolean>;
  readonly onClickPlay: () => void;
  readonly onClickPause: () => void;
  readonly onClickCancel: () => void;

  constructor(
    {src, large, asset, uploadProgress, transferState, play = noop, pause = noop, cancel = noop}: Params,
    element: HTMLElement,
  ) {
    super();
    this.mediaElement = src;
    this.large = large;
    this.asset = asset;
    this.uploadProgress = uploadProgress;
    this.transferState = transferState;

    if (this.large) {
      element.classList.add('media-button-lg');
    }

    this.isPlaying = ko.observable(false);

    this.onClickPlay = () => play();
    this.onClickPause = () => pause();
    this.onClickCancel = () => cancel();

    this.mediaElement.addEventListener('playing', this.onPlay);
    this.mediaElement.addEventListener('pause', this.onPause);
  }

  onPlay = () => {
    this.isPlaying(true);
  };

  onPause = () => {
    this.isPlaying(false);
  };

  dispose = () => {
    this.mediaElement.removeEventListener('playing', this.onPlay);
    this.mediaElement.removeEventListener('pause', this.onPause);
  };
}

ko.components.register('media-button', {
  template: `
    <!-- ko if: isUploaded(transferState()) -->
      <div class='media-button media-button-play icon-play' data-bind="click: onClickPlay, visible: !isPlaying()" data-uie-name="do-play-media"></div>
      <div class='media-button media-button-pause icon-pause' data-bind="click: onClickPause, visible: isPlaying()" data-uie-name="do-pause-media"></div>
    <!-- /ko -->
    <!-- ko if: isDownloading(transferState()) -->
      <asset-loader params="large: large, loadProgress: asset.downloadProgress, onCancel: asset.cancelDownload"></asset-loader>
    <!-- /ko -->
    <!-- ko if: isUploading(transferState()) -->
      <asset-loader params="large: large, loadProgress: uploadProgress, onCancel: onClickCancel"></asset-loader>
    <!-- /ko -->
`,
  viewModel: {
    createViewModel(params: Params, {element}: ko.components.ComponentInfo): MediaButtonComponent {
      return new MediaButtonComponent(params, element as HTMLElement);
    },
  },
});
