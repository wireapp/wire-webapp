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
import {useClickOutside} from 'src/script/hooks/useClickOutside';

import {wrapperStyles} from './ConfigToolbar.styles';

export function ConfigToolbar() {
  const [showConfig, setShowConfig] = useState(false);
  const [isResettingMLSConversation, setIsResettingMLSConversation] = useState(false);
  const [isGzipEnabled, setIsGzipEnabled] = useState(window.wire?.app.debug?.isGzippingEnabled() || false);
  const [configFeaturesState, setConfigFeaturesState] = useState<Configuration['FEATURE']>(Config.getConfig().FEATURE);
  const [isMessageSendingActive, setIsMessageSendingActive] = useState(false);
  const messageCountRef = useRef<number>(0);
  const [prefix, setPrefix] = useState('Message -');
  const [messageDelaySec, setMessageDelaySec] = useState<number>(0);
  const wrapperRef = useRef(null);
  const [avsDebuggerEnabled, setAvsDebuggerEnabled] = useState(!!window.wire?.app?.debug?.isEnabledAvsDebugger());
  const [avsRustSftEnabled, setAvsRustSftEnabled] = useState(!!window.wire?.app?.debug?.isEnabledAvsRustSFT());

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
          quoteEntity: undefined,
        });
        messageCountRef.current++;
      } catch (error) {
        console.error('Error sending message:', error);
      }

      if (isActive) {
        const MS_IN_SEC = 1000;
        const delayMs = messageDelaySec * MS_IN_SEC;
        timeoutId = window.setTimeout(sendMessage, delayMs);
      }
    };

    void sendMessage();

    return () => {
      isActive = false;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [isMessageSendingActive, prefix, messageDelaySec]);

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
    setAvsDebuggerEnabled(!!window.wire?.app?.debug?.enableAvsDebugger(isChecked));
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
    setAvsRustSftEnabled(!!window.wire?.app?.debug?.enableAvsRustSFT(isChecked));
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

  const resetMLSConversation = async () => {
    setIsResettingMLSConversation(true);
    try {
      await window.wire?.app?.debug?.resetMLSConversation();
    } catch (error) {
      console.error('Error resetting MLS conversation:', error);
    } finally {
      setIsResettingMLSConversation(false);
    }
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

      <div>{renderAvsSwitch()}</div>

      <hr />

      <div>{renderAvsRustSftSwitch()}</div>

      <hr />

      <div>{renderGzipSwitch()}</div>

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
