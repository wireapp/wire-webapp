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
  const [configFeaturesState, setConfigFeaturesState] = useState<Configuration['FEATURE']>(Config.getConfig().FEATURE);
  const [intervalId, setIntervalId] = useState<number | null>(null); // Stores active timeout id (renamed kept for minimal change)
  const messageCountRef = useRef<number>(0); // For the message count
  const [prefix, setPrefix] = useState('Message -'); // Prefix input
  // Delay between automated messages in seconds (can be fractional). 0 = send back-to-back.
  const [messageDelaySec, setMessageDelaySec] = useState<number>(0);
  // Ref to always access latest delay inside async loop without re-registering timers
  const messageDelaySecRef = useRef<number>(messageDelaySec);
  const wrapperRef = useRef(null);
  const [avsDebuggerEnabled, setAvsDebuggerEnabled] = useState(!!window.wire?.app?.debug?.isEnabledAvsDebugger()); //

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
    messageDelaySecRef.current = messageDelaySec;
  }, [messageDelaySec]);

  const startSendingMessages = () => {
    if (intervalId) {
      return;
    }

    const sendNext = async () => {
      const conversationState = container.resolve(ConversationState);
      const activeConversation = conversationState?.activeConversation();
      if (!activeConversation) {
        if (intervalId) {
          const MS_IN_SEC = 1000;
          const retryId = window.setTimeout(sendNext, (messageDelaySecRef.current || 0) * MS_IN_SEC);
          setIntervalId(retryId);
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

      const MS_IN_SEC = 1000;
      const delayMs = (messageDelaySecRef.current || 0) * MS_IN_SEC;
      const nextId = window.setTimeout(sendNext, delayMs);
      setIntervalId(nextId);
    };

    const firstId = window.setTimeout(sendNext, 0);
    setIntervalId(firstId);
  };

  // Stop sending messages and reset the counter
  const stopSendingMessages = () => {
    if (intervalId) {
      clearTimeout(intervalId);
      setIntervalId(null);
    }
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

  const renderAvsSwitch = (value: boolean) => {
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

  if (!showConfig) {
    return null;
  }

  const isSending = intervalId !== null;

  return (
    <div ref={wrapperRef} css={wrapperStyles}>
      <h3>Developer Menu</h3>
      <h4 style={{color: 'red', fontWeight: 'bold'}}>
        Caution: Modifying these settings can affect the behavior of the application. Ensure you understand the
        implications of each change before proceeding. Changes may cause unexpected behavior.
      </h4>

      <hr />

      <h3>Debug Functions</h3>

      <Button onClick={() => window.wire?.app?.debug?.reconnectWebSocket()}>reconnectWebSocket</Button>
      <Button onClick={() => window.wire?.app?.debug?.enablePressSpaceToUnmute()}>enablePressSpaceToUnmute</Button>
      <Button onClick={() => window.wire?.app?.debug?.disablePressSpaceToUnmute()}>disablePressSpaceToUnmute</Button>

      <div>{renderAvsSwitch(avsDebuggerEnabled)}</div>

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
      <Button onClick={isSending ? stopSendingMessages : startSendingMessages}>
        {isSending ? 'Stop Sending Messages' : 'Send Incremented Messages'}
      </Button>

      <h3>Database dump & restore</h3>
      <h6 style={{color: 'red', fontWeight: 'bold'}}>
        Caution: this is a destructive action and will overwrite existing data. it is supposed to only be used for
        debugging purposes and WILL RESULT in unexpected behavior & fully breaks your client
      </h6>
      <Button onClick={() => window.wire?.app?.debug?.dumpIndexedDB()}>Dump IndexedDB</Button>
      <Button onClick={() => window.wire?.app?.debug?.restoreIndexedDB()}>Restore IndexedDB</Button>

      <h3>Environment Variables</h3>
      <div>{renderConfig(configFeaturesState)}</div>
    </div>
  );
}
