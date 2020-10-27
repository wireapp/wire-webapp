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
  isQuote: boolean;
  message: ContentMessage;
}

class VideoAssetComponent extends AbstractAssetTransferStateTracker {
  logger: Logger;
  message: ContentMessage;
  asset: FileAsset;
  videoElement: HTMLVideoElement;
  videoSrc: ko.Observable<string>;
  videoTime: ko.Observable<number>;
  videoPlaybackError: ko.Observable<boolean>;
  showBottomControls: ko.Observable<boolean>;
  videoTimeRest: ko.PureComputed<number>;
  preview: ko.Observable<string>;
  displaySmall: ko.Observable<boolean>;
  formatSeconds: (duration: number) => string;

  constructor({message, isQuote}: Params, element: HTMLElement) {
    super(ko.unwrap(message));
    this.logger = getLogger('VideoAssetComponent');

    this.message = ko.unwrap(message);
    this.asset = this.message.get_first_asset() as FileAsset;

    this.videoElement = element.querySelector('video');
    this.videoSrc = ko.observable();
    this.videoTime = ko.observable();

    this.videoPlaybackError = ko.observable(false);
    this.showBottomControls = ko.observable(false);

    this.videoTimeRest = ko.pureComputed(() => this.videoElement.duration - this.videoTime());

    this.preview = ko.observable();

    ko.computed(
      () => {
        if (this.asset.preview_resource()) {
          this.assetRepository
            .load(this.asset.preview_resource())
            .then(blob => this.preview(window.URL.createObjectURL(blob)));
        }
      },
      {disposeWhenNodeIsRemoved: element},
    );

    this.displaySmall = ko.observable(!!isQuote);

    this.formatSeconds = formatSeconds;
    this.AssetTransferState = AssetTransferState;
  }

  onLoadedmetadata(): void {
    this.videoTime(this.videoElement.duration);
  }

  onTimeupdate(): void {
    this.videoTime(this.videoElement.currentTime);
  }

  onError(_component: VideoAssetComponent, jqueryEvent: JQuery.Event<HTMLElement, MouseEvent>): void {
    this.videoPlaybackError(true);
    this.logger.error('Video cannot be played', jqueryEvent);
  }

  onPlayButtonClicked = async (): Promise<void> => {
    this.displaySmall(false);
    if (this.videoSrc()) {
      this.videoElement?.play();
    } else {
      this.asset.status(AssetTransferState.DOWNLOADING);
      try {
        const blob = await this.assetRepository.load(this.asset.original_resource());
        this.videoSrc(window.URL.createObjectURL(blob));
        this.videoElement?.play();
        this.showBottomControls(true);
      } catch (error) {
        this.logger.error('Failed to load video asset ', error);
      }
      this.asset.status(AssetTransferState.UPLOADED);
    }
  };

  onPauseButtonClicked = (): void => {
    this.videoElement?.pause();
  };

  onVideoPlaying(): void {
    this.videoElement.style.backgroundColor = '#000';
  }

  dispose(): void {
    window.URL.revokeObjectURL(this.videoSrc());
    window.URL.revokeObjectURL(this.preview());
  }
}

ko.components.register('video-asset', {
  template: `
    <!-- ko ifnot: message.isObfuscated() -->
      <div class="video-asset-container"
        data-bind="hide_controls: 2000,
                   attr: {'data-uie-value': asset.file_name},
                   css: {'video-asset-container--small': displaySmall()}"
        data-uie-name="video-asset">
        <video playsinline
               data-bind="attr: {src: videoSrc, poster: preview},
                          css: {hidden: transferState() === AssetTransferState.UPLOADING},
                          style: {backgroundColor: preview() ? '#000': ''},
                          event: {loadedmetadata: onLoadedmetadata,
                                  timeupdate: onTimeupdate,
                                  error: onError,
                                  playing: onVideoPlaying}">
        </video>
        <!-- ko if: videoPlaybackError -->
          <div class="video-playback-error label-xs" data-bind="text: t('conversationPlaybackError')"></div>
        <!-- /ko -->
        <!-- ko ifnot: videoPlaybackError -->
          <!-- ko if: transferState() === AssetTransferState.UPLOAD_PENDING -->
            <div class="asset-placeholder loading-dots">
            </div>
          <!-- /ko -->

          <!-- ko if: transferState() !== AssetTransferState.UPLOAD_PENDING -->
            <div class="video-controls-center">
              <!-- ko if: displaySmall() -->
                <media-button params="src: videoElement,
                                      large: false,
                                      asset: asset,
                                      play: onPlayButtonClicked,
                                      transferState: transferState,
                                      uploadProgress: uploadProgress
                                      ">
                </media-button>
              <!-- /ko -->
              <!-- ko ifnot: displaySmall() -->
                <media-button params="src: videoElement,
                                      large: true,
                                      asset: asset,
                                      play: onPlayButtonClicked,
                                      pause: onPauseButtonClicked,
                                      cancel: () => cancelUpload(message),
                                      transferState: transferState,
                                      uploadProgress: uploadProgress
                                      ">
                </media-button>
              <!-- /ko -->
            </div>
            <div class='video-controls-bottom' data-bind='visible: showBottomControls()'>
              <seek-bar data-ui-name="status-video-seekbar" class="video-controls-seekbar" params="src: videoElement"></seek-bar>
              <span class="video-controls-time label-xs" data-bind="text: formatSeconds(videoTimeRest())" data-uie-name="status-video-time"></span>
            </div>
          <!-- /ko -->
        <!-- /ko -->
      </div>
      <div class="video-asset-container__sizer"></div>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params: Params, {element}: ko.components.ComponentInfo): VideoAssetComponent {
      return new VideoAssetComponent(params, element as HTMLElement);
    },
  },
});
