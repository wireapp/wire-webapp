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

import {memo, useCallback, useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';

import {useDebouncedCallback} from 'use-debounce';

import * as Icon from 'Components/icon';
import {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';
import {MediaType} from 'Repositories/media/MediaType';
import {useMediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {createReactTranslationMarker, renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';
import type {Translate} from 'Util/localizerUtil/translationTypes';
import {getLogger} from 'Util/logger';

import {DeviceSelect} from './deviceSelect';

import {Config} from '../../../../../Config';
import {PreferencesSection} from '../components/preferencesSection';

const logger = getLogger('CameraPreferences');

interface CameraPreferencesProps {
  hasActiveCameraStream: boolean;
  refreshStream: () => Promise<MediaStream | void>;
  streamHandler: MediaStreamHandler;
}

const DEBOUNCE_TIMEOUT = 100;

const cameraBrandNameMarker = createReactTranslationMarker('camera-brand-name');
const cameraLineBreakMarker = createReactTranslationMarker('camera-line-break');
const cameraFaqLinkMarker = createReactTranslationMarker('camera-faq-link');

type RenderNoCameraMessageOptions = {
  readonly brandName: string;
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly translate: Translate;
};

function renderNoCameraMessage(options: RenderNoCameraMessageOptions): ReactNode {
  const {brandName, isReactTranslationRenderingEnabled, translate} = options;

  if (isReactTranslationRenderingEnabled) {
    const translatedText = translate(
      'preferencesAVNoCamera',
      {brandName: cameraBrandNameMarker.substitution},
      {
        '/faqLink': cameraFaqLinkMarker.end,
        br: cameraLineBreakMarker.substitution,
        faqLink: cameraFaqLinkMarker.start,
      },
    );

    return (
      <div className="preferences-av-video-disabled__info">
        {renderReactTranslation({
          translatedText,
          componentReplacements: [
            {
              start: cameraFaqLinkMarker.start,
              end: cameraFaqLinkMarker.end,
              render(children): ReactNode {
                return (
                  <a
                    href={Config.getConfig().URL.SUPPORT.CAMERA_ACCESS_DENIED}
                    data-uie-name="go-no-camera-faq"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                );
              },
            },
          ],
          nodeReplacements: [
            {
              marker: cameraLineBreakMarker,
              render(): ReactNode {
                return <br />;
              },
            },
          ],
          valueReplacements: [{marker: cameraBrandNameMarker, runtimeText: brandName}],
        })}
      </div>
    );
  }

  const legacyTranslatedText = translate(
    'preferencesAVNoCamera',
    {brandName},
    {
      '/faqLink': '</a>',
      br: '<br>',
      faqLink: `<a href='${
        Config.getConfig().URL.SUPPORT.CAMERA_ACCESS_DENIED
      }' data-uie-name='go-no-camera-faq' target='_blank' rel='noopener noreferrer'>`,
    },
  );

  return (
    <div
      className="preferences-av-video-disabled__info"
      dangerouslySetInnerHTML={{
        __html: legacyTranslatedText,
      }}
    />
  );
}

const CameraPreferencesComponent = ({streamHandler, refreshStream, hasActiveCameraStream}: CameraPreferencesProps) => {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const [isRequesting, setIsRequesting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoElement = useRef<HTMLVideoElement>(null);

  const {videoInputDevices, videoInputDeviceId, setVideoInputDeviceId} = useMediaDevicesStore(state => ({
    videoInputDevices: state.video.input.devices,
    videoInputDeviceId: state.video.input.selectedId,
    setVideoInputDeviceId: state.setVideoInputDeviceId,
  }));

  const {URL: urls, BRAND_NAME: brandName} = Config.getConfig();
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);

  const requestStream = useCallback(async () => {
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.warn(`Requesting MediaStream for type "${MediaType.VIDEO}" failed: ${error.message}`, error);
      }
      setStream(null);
    } finally {
      setIsRequesting(false);
    }
  }, [hasActiveCameraStream, refreshStream, streamHandler]);

  // Debounce to handle rapid device changes (removeAllDevices + enumerateDevices)
  const debouncedRequestStream = useDebouncedCallback(requestStream, DEBOUNCE_TIMEOUT);

  const cleanUpVideoSrc = () => {
    if (videoElement.current) {
      videoElement.current.srcObject = null;
    }
  };

  useEffect(() => {
    void debouncedRequestStream();
  }, [videoInputDeviceId, videoInputDevices.length, debouncedRequestStream]);

  useEffect(() => {
    if (videoElement.current && stream) {
      cleanUpVideoSrc();

      // Attach the new stream (autoPlay attribute handles playback)
      videoElement.current.srcObject = stream;
    }

    // Cleanup function to properly detach stream when component unmounts or stream changes
    return () => {
      cleanUpVideoSrc();
    };
  }, [stream]);

  useEffect(
    () => () => {
      if (stream && !hasActiveCameraStream) {
        streamHandler.releaseTracksFromStream(stream);
      }
    },
    [hasActiveCameraStream, stream, streamHandler],
  );

  return (
    <PreferencesSection title={translate('preferencesAVCamera')}>
      {!stream && !isRequesting && (
        <div className="preferences-av-detail">
          <a rel="nofollow noopener noreferrer" target="_blank" href={urls.SUPPORT.DEVICE_ACCESS_DENIED}>
            {translate('preferencesAVPermissionDetail')}
          </a>
        </div>
      )}
      <DeviceSelect
        uieName="enter-camera"
        devices={videoInputDevices}
        value={videoInputDeviceId}
        defaultDeviceName={translate('preferencesAVCamera')}
        icon={Icon.CameraIcon}
        isRequesting={isRequesting}
        onChange={deviceId => setVideoInputDeviceId(deviceId)}
        title={translate('preferencesAVCamera')}
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
              {renderNoCameraMessage({brandName, isReactTranslationRenderingEnabled, translate})}
              <button
                type="button"
                className="button-reset-default preferences-av-video-disabled__try-again"
                onClick={requestStream}
                data-uie-name="do-try-again-preferences-av"
              >
                {translate('preferencesAVTryAgain')}
              </button>
            </div>
          )}
        </>
      )}
    </PreferencesSection>
  );
};

export const CameraPreferences = memo(CameraPreferencesComponent);
