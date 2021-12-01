import React, {useState} from 'react';
import {container} from 'tsyringe';
import cx from 'classnames';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import type {Call} from '../../calling/Call';
import type {CallingRepository} from '../../calling/CallingRepository';
import type {MediaRepository} from '../../media/MediaRepository';
import type {PropertiesRepository} from '../../properties/PropertiesRepository';
import {MediaType} from '../../media/MediaType';
import {UserState} from '../../user/UserState';
import Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import {DeviceTypes} from '../../media/MediaDevicesHandler';
import InputLevel from './avPreferences/InputLevel';
import PreferencesSection from './accountPreferences/PreferencesSection';
import {Config} from '../../Config';
import useEffectRef from 'Util/useEffectRef';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';

type MediaSourceChanged = (mediaStream: MediaStream, mediaType: MediaType, call?: Call) => void;
type WillChangeMediaSource = (mediaType: MediaType) => boolean;
type CallBacksType = {
  replaceActiveMediaSource: MediaSourceChanged;
  stopActiveMediaSource: WillChangeMediaSource;
};

interface AVPreferencesProps {
  mediaRepository: MediaRepository;
  propertiesRepository: PropertiesRepository;
  callingRepository: CallingRepository;
  callbacks: CallBacksType;
  userState?: UserState;
}

const AVPreferences: React.FC<AVPreferencesProps> = ({
  mediaRepository: {devicesHandler, constraintsHandler, streamHandler},
  propertiesRepository,
  callingRepository,
  callbacks,
  userState = container.resolve(UserState),
}) => {
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const [isRequestingAudio, setIsRequestingAudio] = useState(false);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);
  const [isRequestingVideo, setIsRequestingVideo] = useState(false);
  const deviceSupport = useKoSubscribableChildren(devicesHandler?.deviceSupport, [
    DeviceTypes.AUDIO_INPUT,
    DeviceTypes.AUDIO_OUTPUT,
    DeviceTypes.VIDEO_INPUT,
  ]);

  const availableDevices = useKoSubscribableChildren(devicesHandler?.availableDevices, [
    DeviceTypes.AUDIO_INPUT,
    DeviceTypes.VIDEO_INPUT,
  ]);

  const currentDeviceId = useKoSubscribableChildren(devicesHandler?.currentDeviceId, [
    DeviceTypes.AUDIO_INPUT,
    DeviceTypes.VIDEO_INPUT,
  ]);

  const hasNoneOrOneAudioInput = availableDevices.audioInput.length < 2;
  const hasNoneOrOneVideoInput = availableDevices.videoInput.length < 2;

  const isAudioInputDisabled = hasNoneOrOneAudioInput || isRequestingAudio;

  const supportUrls = Config.getConfig().URL.SUPPORT;

  return (
    <div>
      {' '}
      <div className="preferences-titlebar">{t('preferencesAV')}</div>
      <div className="preferences-content" ref={setScrollbarRef}>
        {deviceSupport.audioInput && (
          <PreferencesSection title={t('preferencesAVMicrophone')}>
            {!hasAudioTrack && !isRequestingAudio && (
              <div className="preferences-av-detail">
                <a rel="nofollow noopener noreferrer" target="_blank" href={supportUrls.DEVICE_ACCESS_DENIED}>
                  {t('preferencesAVPermissionDetail')}
                </a>
              </div>
            )}
            <div
              className={cx('preferences-option', {
                'preferences-av-select-disabled': isAudioInputDisabled,
              })}
            >
              <div className="preferences-option-icon preferences-av-select-icon">
                <Icon.MicOn />
              </div>
              <div className="input-select">
                <select
                  className={cx('preferences-av-select', {'preferences-av-select-disabled': isAudioInputDisabled})}
                  name="select"
                  disabled={isAudioInputDisabled}
                  value={currentDeviceId.audioInput}
                  data-uie-name="enter-microphone"
                >
                  {(availableDevices.audioInput as MediaDeviceInfo[]).map(({deviceId, label}) => (
                    <option value={deviceId}>{label || t('preferencesAVMicrophone')}</option>
                  ))}
                </select>
                {!hasNoneOrOneAudioInput && <label className="icon-down preferences-av-label" />}
              </div>
            </div>
            {isRequestingAudio ? (
              <div className="preferences-av-spinner">
                <div className="icon-spinner spin accent-text"></div>
              </div>
            ) : (
              <InputLevel
                className="preferences-av-meter accent-text"
                disabled={!hasAudioTrack}
                mediaStream={undefined}
              />
            )}
          </PreferencesSection>
        )}

        {deviceSupport.audioOutput && (
          <PreferencesSection title={t('preferencesAVSpeaker')}>
            <div className="preferences-option">
              <div className="preferences-option-icon preferences-av-select-icon">
                <div className="icon-speaker"></div>
              </div>
              <div className="input-select">
                <select
                  className="preferences-av-select"
                  name="select"
                  data-bind="enabled: availableDevices.audioOutput().length >= 2,
                               options: availableDevices.audioOutput,
                               optionsText: function(item) {return item.label || z.string.preferencesAVSpeakers},
                               optionsValue: 'deviceId',
                               value: currentDeviceId.audioOutput"
                  data-uie-name="enter-speaker"
                ></select>
                <label
                  className="icon-down preferences-av-label"
                  data-bind="visible: availableDevices.audioOutput().length >= 2"
                ></label>
              </div>
            </div>
          </PreferencesSection>
        )}

        {deviceSupport.videoInput && (
          <PreferencesSection title={t('preferencesAVCamera')}>
            {!hasVideoTrack && !isRequestingVideo && (
              <div className="preferences-av-detail">
                <a rel="nofollow noopener noreferrer" target="_blank" href={supportUrls.DEVICE_ACCESS_DENIED}>
                  {t('preferencesAVPermissionDetail')}
                </a>
              </div>
            )}
            <div
              className="preferences-option"
              data-bind="css: {'preferences-av-select-disabled': hasNoneOrOneVideoInput() || isRequestingVideo()}"
            >
              <div className="preferences-option-icon preferences-av-select-icon">
                <Icon.Camera />
              </div>
              <div className="input-select">
                <select
                  className="preferences-av-select"
                  name="select"
                  data-bind="attr: {'disabled': hasNoneOrOneVideoInput() || isRequestingVideo()},
                               css: {'preferences-av-select-disabled': hasNoneOrOneVideoInput() || isRequestingVideo()},
                               options: availableDevices.videoInput,
                               optionsText: function(item) {return item.label || z.string.preferencesAVCamera},
                               optionsValue: 'deviceId',
                               value: currentDeviceId.videoInput"
                  data-uie-name="enter-camera"
                ></select>
                <label
                  className="icon-down preferences-av-label"
                  data-bind="visible: !hasNoneOrOneVideoInput()"
                ></label>
              </div>
            </div>

            {isRequestingVideo ? (
              <div className="preferences-av-video-disabled">
                <div className="icon-spinner spin accent-text"></div>
              </div>
            ) : (
              <>
                {hasVideoTrack ? (
                  <video
                    className="preferences-av-video mirror"
                    autoPlay
                    playsInline
                    data-bind="muteMediaElement: mediaStream(), sourceStream: mediaStream()"
                  ></video>
                ) : (
                  <div className="preferences-av-video-disabled">
                    <div
                      className="preferences-av-video-disabled__info"
                      data-bind="html: t('preferencesAVNoCamera', brandName, {'faqLink': '<a href=\'https://support.wire.com/hc/articles/202935412\' data-uie-name=\'go-no-camera-faq\' target=\'_blank\' rel=\'noopener noreferrer\'>', '/faqLink': '</a>', 'br': '<br>'})"
                    ></div>
                    <div
                      className="preferences-av-video-disabled__try-again"
                      data-bind="click: updateMediaStreamVideoTrack, text: z.string.preferencesAVTryAgain"
                      data-uie-name="do-try-again-preferences-av"
                    ></div>
                  </div>
                )}
              </>
            )}
          </PreferencesSection>
        )}

        <PreferencesSection title={t('preferencesOptionsCall')}>
          <div className="preferences-option">
            <div
              className="preferences-option-icon checkbox accent-text"
              data-bind="attr: {'data-uie-value': optionVbrEncoding}"
              data-uie-name="status-preference-vbr-encoding"
            >
              <input
                type="checkbox"
                id="vbr-encoding-checkbox"
                data-bind="
              attr: {'disabled': isCbrEncodingEnforced},
              checked: optionVbrEncoding"
              />
              <label
                className="preferences-options-checkbox-label"
                htmlFor="vbr-encoding-checkbox"
                data-bind="text: t('preferencesOptionsEnableVbrCheckbox')"
              ></label>
            </div>
          </div>
          <div className="preferences-detail" data-bind="text: t('preferencesOptionsEnableVbrDetails')"></div>
          <div className="preferences-option">
            <div
              className="preferences-option-icon checkbox accent-text"
              data-bind="attr: {'data-uie-value': optionAgcEnabled}"
              data-uie-name="status-preference-agc"
            >
              <input type="checkbox" id="agc-checkbox" data-bind="checked: optionAgcEnabled" />
              <label
                className="preferences-options-checkbox-label"
                htmlFor="agc-checkbox"
                data-bind="text: t('preferencesOptionsEnableAgcCheckbox')"
              ></label>
            </div>
          </div>
          <div className="preferences-detail" data-bind="text: t('preferencesOptionsEnableAgcDetails')"></div>
        </PreferencesSection>

        {callingRepository.supportsCalling && (
          <PreferencesSection title={t('preferencesOptionsCallLogs')}>
            <div className="preferences-option">
              <div
                className="preferences-link accent-text"
                data-bind="click: saveCallLogs, text: t('preferencesOptionsCallLogsGet')"
                data-uie-name="get-call-logs"
              ></div>
            </div>
            <div
              className="preferences-detail"
              data-bind="text: t('preferencesOptionsCallLogsDetail', brandName)"
            ></div>
          </PreferencesSection>
        )}
      </div>
    </div>
  );
};

export default AVPreferences;

registerReactComponent('av-preferences', {
  template:
    '<div data-bind="react:{clientRepository, userRepository, propertiesRepository, conversationRepository}"></div>',
  component: AVPreferences,
});
