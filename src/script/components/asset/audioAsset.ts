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

import {Logger, getLogger} from 'Util/Logger';
import {formatSeconds} from 'Util/TimeUtil';

import {AssetTransferState} from '../../assets/AssetTransferState';
import type {ContentMessage} from '../../entity/message/ContentMessage';
import type {FileAsset} from '../../entity/message/FileAsset';
import {AbstractAssetTransferStateTracker} from './AbstractAssetTransferStateTracker';

interface Params {
  /** Does the asset have a visible header? */
  header: boolean;

  message: ContentMessage;
}

class AudioAssetComponent extends AbstractAssetTransferStateTracker {
  logger: Logger;
  message: ContentMessage;
  asset: FileAsset;
  header: boolean;
  audioSrc: ko.Observable<string>;
  audioElement: HTMLAudioElement;
  audioTime: ko.Observable<number>;
  audioIsLoaded: ko.Observable<boolean>;
  showLoudnessPreview: ko.PureComputed<boolean>;
  formatSeconds: (duration: number) => string;

  constructor({message, header = false}: Params, element: HTMLElement) {
    super(ko.unwrap(message));
    this.logger = getLogger('AudioAssetComponent');

    this.message = ko.unwrap(message);
    this.asset = this.message.get_first_asset() as FileAsset;
    this.header = header;

    this.audioSrc = ko.observable();
    this.audioElement = element.querySelector('audio');
    this.audioTime = ko.observable(0);
    this.audioIsLoaded = ko.observable(false);

    this.showLoudnessPreview = ko.pureComputed(() => !!(this.asset.meta?.loudness?.length > 0));

    if (this.asset.meta) {
      this.audioTime(this.asset.meta.duration);
    }

    element.dataset.uieName = 'audio-asset';
    element.dataset.uieValue = this.asset.file_name;

    this.formatSeconds = formatSeconds;
    this.AssetTransferState = AssetTransferState;
  }

  onTimeupdate(): void {
    this.audioTime(this.audioElement.currentTime);
  }

  onPlayButtonClicked = async () => {
    if (this.audioSrc()) {
      this.audioElement?.play();
    } else {
      this.asset.status(AssetTransferState.DOWNLOADING);
      try {
        const blob = await this.assetRepository.load(this.asset.original_resource());
        this.audioSrc(window.URL.createObjectURL(blob));
        this.audioElement?.play();
      } catch (error) {
        this.logger.error('Failed to load audio asset ', error);
      }
      this.asset.status(AssetTransferState.UPLOADED);
    }
  };

  onPauseButtonClicked = () => {
    this.audioElement?.pause();
  };

  dispose = (): void => {
    window.URL.revokeObjectURL(this.audioSrc());
  };
}

ko.components.register('audio-asset', {
  template: `
    <audio data-bind="attr: {src: audioSrc}, event: {timeupdate: onTimeupdate}"></audio>
    <!-- ko ifnot: message.isObfuscated() -->
      <!-- ko if: header -->
        <asset-header params="message: message"></asset-header>
      <!-- /ko -->
      <!-- ko if: transferState() === AssetTransferState.UPLOAD_PENDING -->
        <div class="asset-placeholder loading-dots">
        </div>
      <!-- /ko -->
      <!-- ko if: transferState() !== AssetTransferState.UPLOAD_PENDING -->
        <div class="audio-controls">
          <media-button params="src: audioElement,
                                asset: asset,
                                play: onPlayButtonClicked,
                                pause: onPauseButtonClicked,
                                cancel: () => cancelUpload(message),
                                transferState: transferState,
                                uploadProgress: uploadProgress
                                ">
          </media-button>
          <!-- ko if: transferState() !== AssetTransferState.UPLOADING -->
            <span class="audio-controls-time label-xs"
                  data-uie-name="status-audio-time"
                  data-bind="text: formatSeconds(audioTime())">
            </span>
            <!-- ko if: showLoudnessPreview -->
              <audio-seek-bar data-uie-name="status-audio-seekbar"
                              params="src: audioElement, asset: asset, disabled: !audioSrc()"></audio-seek-bar>
            <!-- /ko -->
            <!-- ko ifnot: showLoudnessPreview -->
              <seek-bar data-uie-name="status-audio-seekbar"
                        params="src: audioElement, dark: true, disabled: !audioSrc()"></seek-bar>
            <!-- /ko -->
          <!-- /ko -->
        </div>
      <!-- /ko -->
    <!-- /ko -->
    <!-- ko if:  message.isObfuscated() -->
      <mic-on-icon></mic-on-icon>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params: Params, {element}: ko.components.ComponentInfo): AudioAssetComponent {
      return new AudioAssetComponent(params, element as HTMLElement);
    },
  },
});
