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

import React from 'react';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import type {Call} from '../../calling/Call';
import type {CallingRepository} from '../../calling/CallingRepository';
import type {MediaRepository} from '../../media/MediaRepository';
import type {PropertiesRepository} from '../../properties/PropertiesRepository';
import {MediaType} from '../../media/MediaType';
import {t} from 'Util/LocalizerUtil';
import {DeviceTypes} from '../../media/MediaDevicesHandler';
import useEffectRef from 'Util/useEffectRef';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';
import SaveCallLogs from './avPreferences/SaveCallLogs';
import CallOptions from './avPreferences/CallOptions';
import CameraPreferences from './avPreferences/CameraPreferences';
import MicrophonePreferences from './avPreferences/MicrophonePreferences';
import AudioOutPreferences from './avPreferences/AudioOutPreferences';

type MediaSourceChanged = (mediaStream: MediaStream, mediaType: MediaType, call?: Call) => void;
type WillChangeMediaSource = (mediaType: MediaType) => boolean;
type CallBacksType = {
  replaceActiveMediaSource: MediaSourceChanged;
  stopActiveMediaSource: WillChangeMediaSource;
};

interface AVPreferencesProps {
  callbacks: CallBacksType;
  callingRepository: CallingRepository;
  mediaRepository: MediaRepository;
  propertiesRepository: PropertiesRepository;
}

const AVPreferences: React.FC<AVPreferencesProps> = ({
  mediaRepository: {devicesHandler, constraintsHandler, streamHandler},
  propertiesRepository,
  callingRepository,
  callbacks,
}) => {
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);
  const deviceSupport = useKoSubscribableChildren(devicesHandler?.deviceSupport, [
    DeviceTypes.AUDIO_INPUT,
    DeviceTypes.AUDIO_OUTPUT,
    DeviceTypes.VIDEO_INPUT,
  ]);

  const getStreamCallback = (mediaType: MediaType) => (stream: MediaStream) => {
    callingRepository.stopMediaSource(mediaType);
    callingRepository.changeMediaSource(stream, mediaType);
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
      <div className="preferences-titlebar">{t('preferencesAV')}</div>
      <div className="preferences-content" ref={setScrollbarRef}>
        {deviceSupport.audioInput && (
          <MicrophonePreferences
            {...{devicesHandler, streamHandler}}
            streamCallback={getStreamCallback(MediaType.AUDIO)}
          />
        )}
        {deviceSupport.audioOutput && <AudioOutPreferences {...{devicesHandler}} />}
        {deviceSupport.videoInput && (
          <CameraPreferences {...{devicesHandler, streamHandler}} streamCallback={getStreamCallback(MediaType.VIDEO)} />
        )}
        <CallOptions {...{constraintsHandler, propertiesRepository}} />
        {callingRepository.supportsCalling && <SaveCallLogs {...{callingRepository}} />}
      </div>
    </div>
  );
};

export default AVPreferences;

registerReactComponent('av-preferences', {
  component: AVPreferences,
  template: '<div data-bind="react: {callingRepository, mediaRepository, propertiesRepository}"></div>',
});
