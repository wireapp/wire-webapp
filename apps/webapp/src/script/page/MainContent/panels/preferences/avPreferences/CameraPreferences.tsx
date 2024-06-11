/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React, {useEffect, useRef, useState} from 'react';

import {Icon} from 'Components/Icon';
import {MediaDeviceType} from 'src/script/media/MediaDeviceType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {DeviceSelect} from './DeviceSelect';

import {Config} from '../../../../../Config';
import {MediaDevicesHandler} from '../../../../../media/MediaDevicesHandler';
import {MediaStreamHandler} from '../../../../../media/MediaStreamHandler';
import {MediaType} from '../../../../../media/MediaType';
import {PreferencesSection} from '../components/PreferencesSection';

const logger = getLogger('CameraPreferences');

interface CameraPreferencesProps {
  devicesHandler: MediaDevicesHandler;
  hasActiveCameraStream: boolean;
  refreshStream: () => Promise<MediaStream | void>;
  streamHandler: MediaStreamHandler;
}

const CameraPreferences: React.FC<CameraPreferencesProps> = ({
  devicesHandler,
  streamHandler,
  refreshStream,
  hasActiveCameraStream,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoElement = useRef<HTMLVideoElement>(null);
  const {[MediaDeviceType.VIDEO_INPUT]: availableDevices} = useKoSubscribableChildren(
    devicesHandler?.availableDevices,
    [MediaDeviceType.VIDEO_INPUT],
  );

  const {[MediaDeviceType.VIDEO_INPUT]: currentDeviceId} = useKoSubscribableChildren(devicesHandler?.currentDeviceId, [
    MediaDeviceType.VIDEO_INPUT,
  ]);

  const {URL: urls, BRAND_NAME: brandName} = Config.getConfig();

  const requestStream = async () => {
    setIsRequesting(true);
    try {
      // we should be able to change camera from preferences page in middle of the call
      if (hasActiveCameraStream) {
        const refreshedStream = await refreshStream();
        if (!refreshedStream) {
          throw new Error('No stream returned');
        }
        setStream(refreshedStream);
      } else {
        const stream = await streamHandler.requestMediaStream(false, true, false, false);
        if (!stream) {
          throw new Error('No stream returned');
        }
        setStream(stream);
      }
    } catch (error) {
      logger.warn(`Requesting MediaStream for type "${MediaType.VIDEO}" failed: ${error.message}`, error);
      setStream(null);
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    requestStream();
  }, [currentDeviceId]);

  useEffect(() => {
    if (videoElement.current && stream) {
      videoElement.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(
    () => () => {
      if (stream && !hasActiveCameraStream) {
        streamHandler.releaseTracksFromStream(stream);
      }
    },
    [stream],
  );

  return (
    <PreferencesSection title={t('preferencesAVCamera')}>
      {!stream && !isRequesting && (
        <div className="preferences-av-detail">
          <a rel="nofollow noopener noreferrer" target="_blank" href={urls.SUPPORT.DEVICE_ACCESS_DENIED}>
            {t('preferencesAVPermissionDetail')}
          </a>
        </div>
      )}
      <DeviceSelect
        uieName="enter-camera"
        devices={availableDevices as MediaDeviceInfo[]}
        value={currentDeviceId}
        defaultDeviceName={t('preferencesAVCamera')}
        icon={Icon.Camera}
        isRequesting={isRequesting}
        onChange={deviceId => devicesHandler.currentDeviceId[MediaDeviceType.VIDEO_INPUT](deviceId)}
        title={t('preferencesAVCamera')}
      />

      {isRequesting ? (
        <div className="preferences-av-video-disabled">
          <div className="icon-spinner spin accent-text" />
        </div>
      ) : (
        <>
          {stream ? (
            <video className="preferences-av-video mirror" autoPlay playsInline muted ref={videoElement} />
          ) : (
            <div className="preferences-av-video-disabled">
              <div
                className="preferences-av-video-disabled__info"
                dangerouslySetInnerHTML={{
                  __html: t('preferencesAVNoCamera', brandName, {
                    '/faqLink': '</a>',
                    br: '<br>',
                    faqLink: `<a href='${
                      Config.getConfig().URL.SUPPORT.CAMERA_ACCESS_DENIED
                    }' data-uie-name='go-no-camera-faq' target='_blank' rel='noopener noreferrer'>`,
                  }),
                }}
              />
              <button
                type="button"
                className="button-reset-default preferences-av-video-disabled__try-again"
                onClick={requestStream}
                data-uie-name="do-try-again-preferences-av"
              >
                {t('preferencesAVTryAgain')}
              </button>
            </div>
          )}
        </>
      )}
    </PreferencesSection>
  );
};

export {CameraPreferences};
