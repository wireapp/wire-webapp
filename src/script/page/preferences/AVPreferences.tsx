import React, {useState} from 'react';
import {container} from 'tsyringe';
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
import DeviceSelect from './avPreferences/DeviceSelect';

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
    DeviceTypes.AUDIO_OUTPUT,
    DeviceTypes.VIDEO_INPUT,
  ]);

  const currentDeviceId = useKoSubscribableChildren(devicesHandler?.currentDeviceId, [
    DeviceTypes.AUDIO_INPUT,
    DeviceTypes.AUDIO_OUTPUT,
    DeviceTypes.VIDEO_INPUT,
  ]);

  const supportUrls = Config.getConfig().URL.SUPPORT;

  return (
    <div>
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

            <DeviceSelect
              uieName="enter-microphone"
              devices={availableDevices.audioInput as MediaDeviceInfo[]}
              value={currentDeviceId.audioInput}
              defaultDeviceName={t('preferencesAVMicrophone')}
              icon={Icon.MicOn}
              isRequesting={isRequestingAudio}
              onChange={() => {}}
            />
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
            <DeviceSelect
              uieName="enter-speaker"
              onChange={() => {}}
              devices={availableDevices.audioOutput as MediaDeviceInfo[]}
              value={currentDeviceId.audioOutput}
              icon={Icon.Speaker}
              defaultDeviceName={t('preferencesAVSpeakers')}
            />
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
            <DeviceSelect
              uieName="enter-camera"
              devices={availableDevices.videoInput as MediaDeviceInfo[]}
              value={currentDeviceId.videoInput}
              defaultDeviceName={t('preferencesAVCamera')}
              icon={Icon.Camera}
              isRequesting={isRequestingVideo}
              onChange={() => {}}
            />

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
                      dangerouslySetInnerHTML={{
                        __html: t('preferencesAVNoCamera', brandName, {
                          '/faqLink': '</a>',
                          br: '<br>',
                          faqLink:
                            "<a href='https://support.wire.com/hc/articles/202935412' data-uie-name='go-no-camera-faq' target='_blank' rel='noopener noreferrer'>",
                        }),
                      }}
                    ></div>
                    <div
                      className="preferences-av-video-disabled__try-again"
                      onClick={updateMediaStreamVideoTrack}
                      data-uie-name="do-try-again-preferences-av"
                    >
                      {t('preferencesAVTryAgain')}
                    </div>
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
              <div className="preferences-link accent-text" onClick={saveCallLogs} data-uie-name="get-call-logs">
                {t('preferencesOptionsCallLogsGet')}
              </div>
            </div>
            <div className="preferences-detail">{t('preferencesOptionsCallLogsDetail', brandName)}</div>
          </PreferencesSection>
        )}
      </div>
    </div>
  );
};

export default AVPreferences;

registerReactComponent('av-preferences', {
  component: AVPreferences,
  template:
    '<div data-bind="react:{clientRepository, userRepository, propertiesRepository, conversationRepository}"></div>',
});
