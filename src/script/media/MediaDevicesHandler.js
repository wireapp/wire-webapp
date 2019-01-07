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

window.z = window.z || {};
window.z.media = z.media || {};

z.media.MediaDevicesHandler = class MediaDevicesHandler {
  static get CONFIG() {
    return {
      DEFAULT_DEVICE_ID: 'default',
      SCREEN_DEVICE_TYPE: 'screen',
    };
  }

  /**
   * Construct a new MediaDevices handler.
   * @param {z.media.MediaRepository} mediaRepository - Media repository referencing the other handlers
   */
  constructor(mediaRepository) {
    this.mediaRepository = mediaRepository;
    this.logger = new z.util.Logger('z.media.MediaDevicesHandler', z.config.LOGGER.OPTIONS);

    this.availableDevices = {
      audioInput: ko.observableArray([]),
      audioOutput: ko.observableArray([]),
      screenInput: ko.observableArray([]),
      videoInput: ko.observableArray([]),
    };

    this.currentDeviceId = {
      audioInput: ko.observable(),
      audioOutput: ko.observable(),
      screenInput: ko.observable(),
      videoInput: ko.observable(),
    };

    this.currentDeviceIndex = {
      audioInput: ko.observable(0),
      audioOutput: ko.observable(0),
      screenInput: ko.observable(0),
      videoInput: ko.observable(0),
    };

    this.deviceSupport = {
      audioInput: ko.pureComputed(() => !!this.availableDevices.audioInput().length),
      audioOutput: ko.pureComputed(() => !!this.availableDevices.audioOutput().length),
      screenInput: ko.pureComputed(() => !!this.availableDevices.screenInput().length),
      videoInput: ko.pureComputed(() => !!this.availableDevices.videoInput().length),
    };

    this.initializeMediaDevices();
  }

  /**
   * Initialize the list of MediaDevices and subscriptions.
   * @returns {undefined} No return value
   */
  initializeMediaDevices() {
    if (z.media.MediaRepository.supportsMediaDevices()) {
      this.getMediaDevices().then(() => {
        this._setCurrentDevices();
        this._subscribeToObservables();
        this._subscribeToDevices();
      });
    }
  }

  /**
   * Set current media device IDs.
   * @returns {undefined} No return value
   */
  _setCurrentDevices() {
    const defaultDeviceId = MediaDevicesHandler.CONFIG.DEFAULT_DEVICE_ID;

    const audioInputId = z.util.StorageUtil.getValue(z.media.MediaDeviceType.AUDIO_INPUT) || defaultDeviceId;
    this.currentDeviceId.audioInput(audioInputId);

    const audioOutputId = z.util.StorageUtil.getValue(z.media.MediaDeviceType.AUDIO_OUTPUT) || defaultDeviceId;
    this.currentDeviceId.audioOutput(audioOutputId);

    const videoInputId = z.util.StorageUtil.getValue(z.media.MediaDeviceType.VIDEO_INPUT);
    this.currentDeviceId.videoInput(videoInputId);

    const setDefaultVideoId = !this.currentDeviceId.videoInput() && this.deviceSupport.videoInput();
    if (setDefaultVideoId) {
      const defaultDeviceIndex = this.availableDevices.videoInput().length - 1;
      const videoDeviceId = this.availableDevices.videoInput()[defaultDeviceIndex].deviceId;

      this.currentDeviceId.videoInput(videoDeviceId);
      this.currentDeviceIndex.videoInput(defaultDeviceIndex);
    }

    this.logger.info('Set selected MediaDevice IDs');
  }

  /**
   * Subscribe to MediaDevices updates if available.
   * @returns {undefined} No return value
   */
  _subscribeToDevices() {
    navigator.mediaDevices.ondevicechange = () => {
      this.logger.info('List of available MediaDevices has changed');
      this.getMediaDevices();
    };
  }

  /**
   * Subscribe to Knockout observables.
   * @returns {undefined} No return value
   */
  _subscribeToObservables() {
    this.availableDevices.audioInput.subscribe(mediaDevices => {
      if (mediaDevices.length) {
        this._updateCurrentIndexFromDevices(z.media.MediaDeviceType.AUDIO_INPUT, mediaDevices);
      }
    });

    this.availableDevices.audioOutput.subscribe(mediaDevices => {
      if (mediaDevices.length) {
        this._updateCurrentIndexFromDevices(z.media.MediaDeviceType.AUDIO_OUTPUT, mediaDevices);
      }
    });

    this.availableDevices.screenInput.subscribe(mediaDevices => {
      if (mediaDevices.length) {
        this._updateCurrentIndexFromDevices(z.media.MediaDeviceType.SCREEN_INPUT, mediaDevices);
      }
    });

    this.availableDevices.videoInput.subscribe(mediaDevices => {
      if (mediaDevices.length) {
        this._updateCurrentIndexFromDevices(z.media.MediaDeviceType.VIDEO_INPUT, mediaDevices);
      }
    });

    this.currentDeviceId.audioInput.subscribe(mediaDeviceId => {
      z.util.StorageUtil.setValue(z.media.MediaDeviceType.AUDIO_INPUT, mediaDeviceId);

      const updateStream = mediaDeviceId && this.mediaRepository.streamHandler.localMediaStream();
      if (updateStream) {
        this._replaceInputDevice(z.media.MediaType.AUDIO, z.media.MediaDeviceType.AUDIO_INPUT, mediaDeviceId);
      }
    });

    this.currentDeviceId.audioOutput.subscribe(mediaDeviceId => {
      z.util.StorageUtil.setValue(z.media.MediaDeviceType.AUDIO_OUTPUT, mediaDeviceId);

      if (mediaDeviceId) {
        this.mediaRepository.elementHandler.switchMediaElementOutput(mediaDeviceId);
        this._updateCurrentIndexFromId(z.media.MediaDeviceType.AUDIO_OUTPUT, mediaDeviceId);
      }
    });

    this.currentDeviceId.screenInput.subscribe(mediaDeviceId => {
      if (mediaDeviceId) {
        this._updateCurrentIndexFromId(z.media.MediaDeviceType.SCREEN_INPUT, mediaDeviceId);
      }

      const isMediaTypeScreen = this.mediaRepository.streamHandler.localMediaType() === z.media.MediaType.SCREEN;
      const updateStream = mediaDeviceId && isMediaTypeScreen && this.mediaRepository.streamHandler.localMediaStream();
      if (updateStream) {
        this._replaceInputDevice(z.media.MediaType.SCREEN, z.media.MediaDeviceType.SCREEN_INPUT, mediaDeviceId);
      }
    });

    this.currentDeviceId.videoInput.subscribe(mediaDeviceId => {
      if (mediaDeviceId) {
        this._updateCurrentIndexFromId(z.media.MediaDeviceType.VIDEO_INPUT, mediaDeviceId);
      }

      z.util.StorageUtil.setValue(z.media.MediaDeviceType.VIDEO_INPUT, mediaDeviceId);

      const isMediaTypeVideo = this.mediaRepository.streamHandler.localMediaType() === z.media.MediaType.VIDEO;
      const updateStream = mediaDeviceId && isMediaTypeVideo && this.mediaRepository.streamHandler.localMediaStream();
      if (updateStream) {
        this._replaceInputDevice(z.media.MediaType.VIDEO, z.media.MediaDeviceType.VIDEO_INPUT, mediaDeviceId);
      }
    });
  }

  /**
   * Update list of available MediaDevices.
   * @returns {Promise} Resolves with all MediaDevices when the list has been updated
   */
  getMediaDevices() {
    return navigator.mediaDevices
      .enumerateDevices()
      .catch(error => {
        this.logger.error(`Failed to update MediaDevice list: ${error.message}`, error);
        throw error;
      })
      .then(mediaDevices => {
        this._removeAllDevices();

        if (mediaDevices) {
          const audioInputDevices = [];
          const audioOutputDevices = [];
          const videoInputDevices = [];

          mediaDevices.forEach(mediaDevice => {
            switch (mediaDevice.kind) {
              case z.media.MediaDeviceType.AUDIO_INPUT: {
                audioInputDevices.push(mediaDevice);
                break;
              }

              case z.media.MediaDeviceType.AUDIO_OUTPUT: {
                audioOutputDevices.push(mediaDevice);
                break;
              }

              case z.media.MediaDeviceType.VIDEO_INPUT: {
                videoInputDevices.push(mediaDevice);
                break;
              }

              default: {
                throw new z.error.MediaError(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
              }
            }
          });

          z.util.koArrayPushAll(this.availableDevices.audioInput, audioInputDevices);
          z.util.koArrayPushAll(this.availableDevices.audioOutput, audioOutputDevices);
          z.util.koArrayPushAll(this.availableDevices.videoInput, videoInputDevices);

          this.logger.info('Updated MediaDevice list', mediaDevices);
          return mediaDevices;
        }
        throw new z.error.MediaError(z.error.MediaError.TYPE.NO_MEDIA_DEVICES_FOUND);
      });
  }

  /**
   * Update list of available Screens.
   * @returns {Promise} resolves with all screen sources when the list has been updated
   */
  getScreenSources() {
    return new Promise((resolve, reject) => {
      const options = {
        thumbnailSize: {
          height: 176,
          width: 312,
        },
        types: [MediaDevicesHandler.CONFIG.SCREEN_DEVICE_TYPE],
      };

      return window.desktopCapturer.getSources(options, (error, screenSources) => {
        if (error) {
          return reject(error);
        }

        this.logger.info(`Detected '${screenSources.length}' sources for screen sharing from Electron`, screenSources);
        this.availableDevices.screenInput(screenSources);

        if (screenSources.length === 1) {
          const [firstScreenSource] = screenSources;
          this.currentDeviceId.screenInput('');
          this.logger.info(`Selected '${firstScreenSource.name}' for screen sharing`, firstScreenSource);
          this.currentDeviceId.screenInput(firstScreenSource.id);
        }
        return resolve(screenSources);
      });
    });
  }

  /**
   * Replace input device of given type
   *
   * @private
   * @param {z.media.MediaType} mediaType - Media type to change device for
   * @param {z.media.MediaDeviceType} mediaDeviceType - Media device type to change
   * @param {string} mediaDeviceId - New media device Id
   * @returns {undefined} No return value
   */
  _replaceInputDevice(mediaType, mediaDeviceType, mediaDeviceId) {
    this.mediaRepository.streamHandler
      .replaceInputSource(mediaType)
      .then(() => this._updateCurrentIndexFromId(mediaDeviceType, mediaDeviceId))
      .catch(error => {
        this.logger.error(`Failed to replace input device of type '${mediaType}'`, error);
      });
  }

  /**
   * Toggle between the available cameras.
   * @returns {Promise} Resolves when camera has been toggled.
   */
  toggleNextCamera() {
    return this.getMediaDevices().then(() => {
      const availableDevices = this.availableDevices.videoInput();
      const currentDeviceId = this.currentDeviceId.videoInput;
      const currentDeviceIndex = this.currentDeviceIndex.videoInput();

      const {deviceName, nextDeviceId} = this._toggleNextDevice(availableDevices, currentDeviceId, currentDeviceIndex);
      this.logger.info(`Switching the active camera from '${deviceName}' to '${nextDeviceId}'`);
    });
  }

  /**
   * Toggle between the available screens.
   * @returns {Promise} Resolves when screen has been toggled.
   */
  toggleNextScreen() {
    return this.getScreenSources().then(() => {
      const availableDevices = this.availableDevices.screenInput();
      const currentDeviceId = this.currentDeviceId.screenInput;
      const currentDeviceIndex = this.currentDeviceIndex.screenInput();

      const {deviceName, nextDeviceId} = this._toggleNextDevice(availableDevices, currentDeviceId, currentDeviceIndex);
      this.logger.info(`Switching the active screen from '${deviceName}' to '${nextDeviceId}'`);
    });
  }

  _toggleNextDevice(availableDevices, currentDeviceIdObservable, currentDeviceIndex) {
    const {device} = this._getCurrentDevice(availableDevices, currentDeviceIdObservable());
    const nextIndex = z.util.ArrayUtil.iterateIndex(availableDevices, currentDeviceIndex);

    const nextDevice = availableDevices[nextIndex || 0];
    const deviceId = nextDevice.deviceId || nextDevice.id;
    const label = nextDevice.label || nextDevice.name;

    currentDeviceIdObservable(deviceId);

    const deviceName = device ? device.label || device.deviceId : undefined;
    const nextDeviceId = label || deviceId;

    return {deviceName, nextDeviceId};
  }

  /**
   * Check for availability of selected devices.
   * @param {boolean} videoSend - Also check for video devices
   * @returns {Promise} Resolves when the current device has been updated
   */
  updateCurrentDevices(videoSend) {
    return this.getMediaDevices().then(() => {
      const _checkDevice = (mediaType, deviceType) => {
        deviceType = this._typeConversion(deviceType);

        const deviceIdObservable = this.currentDeviceId[`${deviceType}`];
        const mediaDevices = this.availableDevices[`${deviceType}`]();
        const {device: mediaDevice} = this._getCurrentDevice(mediaDevices, deviceIdObservable());

        if (!mediaDevice) {
          const [updatedDevice] = this.availableDevices[`${deviceType}`]();

          if (updatedDevice) {
            const id = updatedDevice.label || updatedDevice.deviceId;
            const log = `Selected '${mediaType}' device '${deviceIdObservable()}' not found and replaced by '${id}'`;
            this.logger.warn(log, mediaDevices);
            return deviceIdObservable(updatedDevice.deviceId);
          }

          const logMessage = `Selected '${mediaType}' device '${deviceIdObservable()}' not found and reset'`;
          this.logger.warn(logMessage, mediaDevices);
          return deviceIdObservable('');
        }
      };

      _checkDevice(z.media.MediaType.AUDIO, z.media.MediaDeviceType.AUDIO_INPUT);
      if (videoSend) {
        _checkDevice(z.media.MediaType.VIDEO, z.media.MediaDeviceType.VIDEO_INPUT);
      }
    });
  }

  /**
   * Get the currently selected MediaDevice.
   *
   * @param {Array} mediaDevices - Array of MediaDevices
   * @param {string} currentDeviceId - ID of selected MediaDevice
   * @returns {Object} Selected MediaDevice and its array index
   */
  _getCurrentDevice(mediaDevices, currentDeviceId) {
    for (const [index, mediaDevice] of mediaDevices.entries()) {
      const isCurrentDevice = mediaDevice.deviceId === currentDeviceId || mediaDevice.id === currentDeviceId;
      if (isCurrentDevice) {
        return {device: mediaDevice, deviceIndex: index};
      }
    }

    return {deviceIndex: 0};
  }

  /**
   * Remove all known MediaDevices from the lists.
   * @private
   * @returns {undefined} No return value
   */
  _removeAllDevices() {
    this.availableDevices.audioInput.removeAll();
    this.availableDevices.audioOutput.removeAll();
    this.availableDevices.videoInput.removeAll();
  }

  /**
   * Add uppercase to MediaDevice types.
   * @private
   * @param {z.media.MediaDeviceType} deviceType - Device type string to update
   * @returns {string} Updated device type
   */
  _typeConversion(deviceType) {
    return deviceType.replace('input', 'Input').replace('output', 'Output');
  }

  /**
   * Update the current index by searching for the current device.
   *
   * @private
   * @param {ko.observable} indexObservable - Observable containing the current index
   * @param {Array} availableDevices - Array of MediaDevices
   * @param {string} currentDeviceId - Current device ID to look for
   * @returns {undefined} No return value
   */
  _updateCurrentDeviceIndex(indexObservable, availableDevices, currentDeviceId) {
    const {deviceIndex} = this._getCurrentDevice(availableDevices, currentDeviceId);

    if (_.isNumber(deviceIndex)) {
      indexObservable(deviceIndex);
    }
  }

  /**
   * Update the index for current device after the list of devices changed.
   * @private
   * @param {z.media.MediaDeviceType} deviceType - MediaDeviceType to be updates
   * @param {Array} availableDevices - Array of MediaDevices
   * @returns {undefined} No return value
   */
  _updateCurrentIndexFromDevices(deviceType, availableDevices) {
    deviceType = this._typeConversion(deviceType);
    const deviceIndexObservable = this.currentDeviceIndex[deviceType];
    const currentDeviceId = this.currentDeviceId[deviceType]();

    this._updateCurrentDeviceIndex(deviceIndexObservable, availableDevices, currentDeviceId);
  }

  /**
   * Update the index for current device after the current device changed.
   * @private
   * @param {z.media.MediaDeviceType} deviceType - MediaDeviceType to be updates
   * @param {string} selectedInputDeviceId - ID of selected input device
   * @returns {undefined} No return value
   */
  _updateCurrentIndexFromId(deviceType, selectedInputDeviceId) {
    deviceType = this._typeConversion(deviceType);
    const deviceIndexObservable = this.currentDeviceIndex[deviceType];
    const availableDevices = this.availableDevices[deviceType]();

    this._updateCurrentDeviceIndex(deviceIndexObservable, availableDevices, selectedInputDeviceId);
  }
};
