/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useState, useEffect, useRef} from 'react';

import keyboardjs from 'keyboardjs';
import {container} from 'tsyringe';

import {Button, Input, Switch} from '@wireapp/react-ui-kit';

import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Config, Configuration} from 'src/script/Config';
import {StartupFeatureToggleName, startupFeatureToggleNames} from 'src/script/featureToggles/startupFeatureToggleNames';
import {updateLocationSearchForStartupFeatureToggle} from 'src/script/featureToggles/startupFeatureToggleQueryParameters';
import {useClickOutside} from 'src/script/hooks/useClickOutside';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CoreCryptoLogLevel} from 'Util/debugUtil';

import {wrapperStyles} from './configToolbar.styles';

export function createLocationUrl(pathname: string, search: string, hash: string): string {
  return `${pathname}${search}${hash}`;
}

function getStartOfToday(): Date {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return startOfToday;
}

function toDateInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type NotificationDumpToMode = 'now' | 'date';

function getEndOfDate(dateInputValue: string): Date {
  return new Date(`${dateInputValue}T23:59:59.999`);
}

export function ConfigToolbar() {
  const {fireAndForgetInvoker, applicationNavigation, isFeatureToggleEnabled} = useApplicationContext();
  const alphabeticallySortedStartupFeatureToggleNames = startupFeatureToggleNames.toSorted();
  const [showConfig, setShowConfig] = useState(false);
  const [isResettingMLSConversation, setIsResettingMLSConversation] = useState(false);
  const [isGzipEnabled, setIsGzipEnabled] = useState(window.wire?.app.debug?.isGzippingEnabled() ?? false);
  const [configFeaturesState, setConfigFeaturesState] = useState<Configuration['FEATURE']>(Config.getConfig().FEATURE);
  const [isMessageSendingActive, setIsMessageSendingActive] = useState(false);
  const messageCountRef = useRef<number>(0);
  const [prefix, setPrefix] = useState('Message -');
  const [messageDelaySec, setMessageDelaySec] = useState<number>(0);
  const wrapperRef = useRef(null);
  const [avsDebuggerEnabled, setAvsDebuggerEnabled] = useState(
    window.wire?.app?.debug?.isEnabledAvsDebugger() ?? false,
  );
  const [avsRustSftEnabled, setAvsRustSftEnabled] = useState(window.wire?.app?.debug?.isEnabledAvsRustSFT() ?? false);
  const [videoBackgroundEffectsFeatureEnabled, setVideoBackgroundEffectsFeatureEnabled] = useState(
    window.wire?.app?.debug?.isVideoBackgroundEffectsFeatureEnabled() ?? false,
  );
  const [coreCryptoLevel, setCoreCryptoLevel] = useState<CoreCryptoLogLevel>(CoreCryptoLogLevel.Info);
  const [notificationDumpFrom, setNotificationDumpFrom] = useState(() => toDateInputValue(getStartOfToday()));
  const [notificationDumpToMode, setNotificationDumpToMode] = useState<NotificationDumpToMode>('now');
  const [notificationDumpToDate, setNotificationDumpToDate] = useState(() => toDateInputValue(new Date()));
  const [isDownloadingNotifications, setIsDownloadingNotifications] = useState(false);

  // Toggle config tool on 'cmd/ctrl + shift + 2'
  useEffect(() => {
    const handleKeyDown = () => {
      setShowConfig(prev => !prev);
    };

    keyboardjs.bind(['command+shift+2', 'ctrl+shift+2'], handleKeyDown);

    return () => {
      keyboardjs.unbind(['command+shift+2', 'ctrl+shift+2'], handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isMessageSendingActive) {
      return () => {};
    }

    let timeoutId: number | null = null;
    let isActive = true;

    const sendMessage = async (): Promise<void> => {
      if (!isActive) {
        return;
      }

      const conversationState = container.resolve(ConversationState);
      const activeConversation = conversationState?.activeConversation();

      if (!activeConversation) {
        if (isActive) {
          const MS_IN_SEC = 1000;
          timeoutId = window.setTimeout(sendMessage, messageDelaySec * MS_IN_SEC);
        }
        return;
      }

      try {
        await window.wire.app.repository.message.sendTextWithLinkPreview({
          conversation: activeConversation,
          textMessage: `${prefix} ${messageCountRef.current}`,
          mentions: [],
          QuoteEntity: undefined,
        });
        messageCountRef.current++;
      } catch (error: unknown) {
        console.error('Error sending message:', error);
      }

      if (isActive) {
        const MS_IN_SEC = 1000;
        const delayMs = messageDelaySec * MS_IN_SEC;
        timeoutId = window.setTimeout(sendMessage, delayMs);
      }
    };

    fireAndForgetInvoker.fireAndForget(sendMessage);

    return () => {
      isActive = false;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [fireAndForgetInvoker, isMessageSendingActive, prefix, messageDelaySec]);

  const startSendingMessages = () => {
    messageCountRef.current = 0;
    setIsMessageSendingActive(true);
  };

  const stopSendingMessages = () => {
    setIsMessageSendingActive(false);
    messageCountRef.current = 0;
  };

  // Update the config state when form input changes
  const handleChange = (path: string, value: string | boolean | string[]) => {
    const updateConfig = (obj: any, keys: string[]): void => {
      if (keys.length === 1) {
        obj[keys[0]] = value;
      } else {
        updateConfig(obj[keys[0]], keys.slice(1));
      }
    };

    const updatedConfig = {...configFeaturesState};
    updateConfig(updatedConfig, path.split('.'));
    setConfigFeaturesState(updatedConfig);
    Config._dangerouslySetConfigFeaturesForDebug(updatedConfig);
  };

  const renderInput = (value: string | boolean | string[] | number | object | null, path: string) => {
    if (typeof value === 'boolean') {
      return <Switch checked={value} onToggle={isChecked => handleChange(path, isChecked)} />;
    }

    if (Array.isArray(value)) {
      return (
        <Input
          type="text"
          value={value.join(',')}
          onChange={event =>
            handleChange(
              path,
              event.currentTarget.value.split(',').map(value => value.trim()),
            )
          }
        />
      );
    }

    if (typeof value === 'object' && value !== null) {
      return renderConfig(value, path);
    }

    return (
      <Input type="text" value={value as string} onChange={event => handleChange(path, event.currentTarget.value)} />
    );
  };

  const renderConfig = (configObj: object, parentPath: string = '') => {
    const entries = Object.entries(configObj);

    return entries.map(([key, value]) => {
      const path = parentPath ? `${parentPath}.${key}` : key;
      return (
        <div key={path} style={{marginBottom: '10px'}}>
          <label style={{display: 'block', fontWeight: 'bold'}}>{key.split('_').join(' ')}</label>
          {renderInput(value, path)}
        </div>
      );
    });
  };

  useClickOutside(wrapperRef, () => setShowConfig(false));

  const handleAvsEnable = (isChecked: boolean) => {
    setAvsDebuggerEnabled(window.wire?.app?.debug?.enableAvsDebugger(isChecked) === true);
  };

  const renderAvsSwitch = () => {
    return (
      <div style={{marginBottom: '10px'}}>
        <label htmlFor="avs-debugger-checkbox" style={{display: 'block', fontWeight: 'bold'}}>
          ENABLE AVS TRACK DEBUGGER
        </label>
        <Switch
          id="avs-debugger-checkbox"
          checked={avsDebuggerEnabled}
          onToggle={isChecked => handleAvsEnable(isChecked)}
        />
      </div>
    );
  };

  const handleAvsRustSftEnable = (isChecked: boolean) => {
    setAvsRustSftEnabled(window.wire?.app?.debug?.enableAvsRustSFT(isChecked) === true);
  };
  const renderAvsRustSftSwitch = () => {
    return (
      <div style={{marginBottom: '10px'}}>
        <label htmlFor="avs-rust-sft-checkbox" style={{display: 'block', fontWeight: 'bold'}}>
          ENABLE AVS RUST SFT
        </label>
        <Switch
          id="avs-rust-sft-checkbox"
          checked={avsRustSftEnabled}
          onToggle={isChecked => handleAvsRustSftEnable(isChecked)}
        />
      </div>
    );
  };

  const handleBackgroundEffectsFeature = (isChecked: boolean) => {
    setVideoBackgroundEffectsFeatureEnabled(
      window.wire?.app?.debug?.enableVideoBackgroundEffectsFeature(isChecked) === true,
    );
  };
  const renderBackgroundEffectsFeatureSelect = () => {
    return (
      <div style={{marginBottom: '10px'}}>
        <label htmlFor="video-background-effects-feature-checkbox" style={{display: 'block', fontWeight: 'bold'}}>
          ENABLE VIDEO BACKGROUND EFFECTS
        </label>
        <Switch
          id="video-background-effects-feature-checkbox"
          checked={videoBackgroundEffectsFeatureEnabled}
          onToggle={isChecked => handleBackgroundEffectsFeature(isChecked)}
        />
      </div>
    );
  };

  const renderGzipSwitch = () => {
    return (
      <div style={{marginBottom: '10px'}}>
        <label htmlFor="gzip-checkbox" style={{display: 'block', fontWeight: 'bold'}}>
          ENABLE GZIP
        </label>
        <Switch
          id="gzip-checkbox"
          checked={isGzipEnabled}
          onToggle={() => {
            setIsGzipEnabled(previousIsGzipEnabled => {
              window.wire?.app?.debug?.toggleGzipping(!previousIsGzipEnabled);
              return !previousIsGzipEnabled;
            });
          }}
        />
      </div>
    );
  };

  const renderCoreCryptoLogLevelSelect = () => {
    const options: Array<{label: string; value: CoreCryptoLogLevel}> = [
      {label: 'Off', value: CoreCryptoLogLevel.Off},
      {label: 'Trace', value: CoreCryptoLogLevel.Trace},
      {label: 'Debug', value: CoreCryptoLogLevel.Debug},
      {label: 'Info', value: CoreCryptoLogLevel.Info},
      {label: 'Warn', value: CoreCryptoLogLevel.Warn},
      {label: 'Error', value: CoreCryptoLogLevel.Error},
    ];

    return (
      <div style={{marginBottom: '10px'}}>
        <label htmlFor="core-crypto-loglevel" style={{display: 'block', fontWeight: 'bold'}}>
          CORE CRYPTO LOG LEVEL
        </label>
        <select
          id="core-crypto-loglevel"
          value={coreCryptoLevel}
          onChange={event => {
            const val = Number(event.currentTarget.value) as CoreCryptoLogLevel;
            setCoreCryptoLevel(val);
            fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
              await window.wire?.app?.debug?.setCoreCryptoMaxLogLevel(val);
            });
          }}
          style={{padding: '6px 8px'}}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  function reloadApplicationForStartupFeatureToggle(
    featureToggleName: StartupFeatureToggleName,
    shouldEnableFeatureToggle: boolean,
  ): void {
    const locationSearch = applicationNavigation.currentSearch;
    const nextLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch,
      featureToggleName,
      shouldEnableFeatureToggle,
    });
    const locationPathname = applicationNavigation.currentPathname;
    const locationHash = applicationNavigation.currentHash;
    const nextLocationUrl = createLocationUrl(locationPathname, nextLocationSearch, locationHash);

    applicationNavigation.navigateTo(nextLocationUrl);
  }

  function renderStartupFeatureToggleCheckboxList() {
    return (
      <fieldset style={{margin: 0, border: 0, padding: 0}}>
        <legend style={{fontWeight: 'bold', marginBottom: '8px'}}>Startup Feature Toggles</legend>
        <ul style={{listStyle: 'none', margin: 0, padding: 0}}>
          {alphabeticallySortedStartupFeatureToggleNames.map(featureToggleName => {
            const featureToggleCheckboxIdentifier = `startup-feature-toggle-checkbox-${featureToggleName}`;

            return (
              <li key={featureToggleName} style={{marginBottom: '10px'}}>
                <label htmlFor={featureToggleCheckboxIdentifier} style={{display: 'block'}}>
                  <input
                    id={featureToggleCheckboxIdentifier}
                    type="checkbox"
                    checked={isFeatureToggleEnabled(featureToggleName)}
                    onChange={event => {
                      reloadApplicationForStartupFeatureToggle(featureToggleName, event.currentTarget.checked);
                    }}
                  />
                  {` ${featureToggleName}`}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
    );
  }

  const resetMLSConversation = async () => {
    setIsResettingMLSConversation(true);
    try {
      await window.wire?.app?.debug?.resetMLSConversation();
    } catch (error: unknown) {
      console.error('Error resetting MLS conversation:', error);
    } finally {
      setIsResettingMLSConversation(false);
    }
  };

  const downloadNotificationsDump = async () => {
    setIsDownloadingNotifications(true);
    try {
      const from = new Date(`${notificationDumpFrom}T00:00:00`);
      const to = notificationDumpToMode === 'now' ? new Date() : getEndOfDate(notificationDumpToDate);

      if (Number.isNaN(from.getTime())) {
        throw new Error('Invalid start date');
      }

      if (Number.isNaN(to.getTime())) {
        throw new Error('Invalid end date');
      }

      if (from.getTime() > to.getTime()) {
        throw new Error('Start date must be before end date');
      }

      await window.wire?.app?.debug?.downloadNotificationsDump(from, to);
    } catch (error: unknown) {
      console.error('Error downloading notifications dump:', error);
    } finally {
      setIsDownloadingNotifications(false);
    }
  };

  const renderNotificationDumpSection = () => {
    return (
      <>
        <h3>Notification Dump</h3>
        <p>
          Fetches raw notification payloads from the backend for the selected time range and saves them as JSON. Message
          content stays encrypted (OTR/MLS ciphertext only); nothing is decrypted locally.
        </p>
        <div style={{marginBottom: '10px'}}>
          <label htmlFor="notification-dump-from" style={{display: 'block', fontWeight: 'bold'}}>
            From
          </label>
          <input
            id="notification-dump-from"
            type="date"
            value={notificationDumpFrom}
            onChange={event => setNotificationDumpFrom(event.currentTarget.value)}
            style={{padding: '6px 8px', width: '100%'}}
          />
        </div>
        <div style={{marginBottom: '10px'}}>
          <span style={{display: 'block', fontWeight: 'bold', marginBottom: '8px'}}>To</span>
          <label htmlFor="notification-dump-to-now" style={{display: 'block', marginBottom: '8px'}}>
            <input
              id="notification-dump-to-now"
              type="radio"
              name="notification-dump-to-mode"
              checked={notificationDumpToMode === 'now'}
              onChange={() => setNotificationDumpToMode('now')}
            />
            {' Now'}
          </label>
          <label htmlFor="notification-dump-to-date-mode" style={{display: 'block', marginBottom: '8px'}}>
            <input
              id="notification-dump-to-date-mode"
              type="radio"
              name="notification-dump-to-mode"
              checked={notificationDumpToMode === 'date'}
              onChange={() => setNotificationDumpToMode('date')}
            />
            {' Date'}
          </label>
          {notificationDumpToMode === 'date' && (
            <input
              id="notification-dump-to-date"
              type="date"
              value={notificationDumpToDate}
              onChange={event => setNotificationDumpToDate(event.currentTarget.value)}
              style={{padding: '6px 8px', width: '100%'}}
            />
          )}
        </div>
        <Button disabled={isDownloadingNotifications} onClick={downloadNotificationsDump}>
          {isDownloadingNotifications ? 'Downloading…' : 'Download notifications'}
        </Button>
      </>
    );
  };

  if (!showConfig) {
    return null;
  }

  return (
    <div ref={wrapperRef} css={wrapperStyles}>
      <h3>Developer Menu</h3>
      <h4 style={{color: 'red', fontWeight: 'bold'}}>
        Caution: Modifying these settings can affect the behavior of the application. Ensure you understand the
        implications of each change before proceeding. Changes may cause unexpected behavior.
      </h4>

      <hr />

      <h3>Debug Functions</h3>

      <Button onClick={() => window.wire?.app?.debug?.reconnectWebSocket()}>Reconnect WebSocket</Button>
      <Button onClick={() => window.wire?.app?.debug?.enablePressSpaceToUnmute()}>Enable Press Space To Unmute</Button>
      <Button onClick={() => window.wire?.app?.debug?.disablePressSpaceToUnmute()}>
        Disable Press Space To Unmute
      </Button>
      <Button disabled={isResettingMLSConversation} onClick={resetMLSConversation}>
        Reset MLS Conversation
      </Button>
      <Button onClick={() => window.wire?.app?.debug?.refreshE2EIRevocationData()}>Force CRL expiry</Button>
      <Button onClick={() => {}}>Migrate convo to MLS</Button>

      <hr />

      <div>{renderNotificationDumpSection()}</div>

      <hr />

      <div>{renderAvsSwitch()}</div>

      <hr />

      <div>{renderAvsRustSftSwitch()}</div>

      <hr />

      <div>{renderBackgroundEffectsFeatureSelect()}</div>

      <hr />

      <div>{renderGzipSwitch()}</div>

      <hr />

      <div>{renderCoreCryptoLogLevelSelect()}</div>

      <hr />

      <div>{renderStartupFeatureToggleCheckboxList()}</div>

      <hr />

      <h3>Message Automation</h3>
      <Input
        type="text"
        value={prefix}
        onChange={event => setPrefix(event.currentTarget.value)}
        placeholder="Prefix for the messages"
      />
      <div style={{marginTop: '8px'}}>
        <label htmlFor="message-delay-input" style={{display: 'block', fontWeight: 'bold'}}>
          Delay Between Messages (seconds)
        </label>
        <Input
          id="message-delay-input"
          type="number"
          min={0}
          step={0.1}
          value={messageDelaySec}
          onChange={event => {
            const val = parseFloat(event.currentTarget.value);
            setMessageDelaySec(Number.isNaN(val) || val < 0 ? 0 : val);
          }}
          placeholder="0"
        />
      </div>

      <Button onClick={isMessageSendingActive ? stopSendingMessages : startSendingMessages}>
        {isMessageSendingActive ? 'Stop Sending Messages' : 'Send Incremented Messages'}
      </Button>

      <h3>Environment Variables</h3>
      <div>{renderConfig(configFeaturesState)}</div>
    </div>
  );
}
