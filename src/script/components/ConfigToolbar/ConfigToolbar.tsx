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
  const [intervalId, setIntervalId] = useState<number | null>(null); // For managing setInterval
  const messageCountRef = useRef<number>(0); // For the message count
  const [prefix, setPrefix] = useState('Message -'); // Prefix input
  const wrapperRef = useRef(null);
  const [avsDebuggerEnabled, setAvsDebuggerEnabled] = useState(!!window.wire?.app?.debug?.isEnabledAvsDebugger()); //
  const [avsRustSftEnabled, setAvsRustSftEnabled] = useState(!!window.wire?.app?.debug?.isEnabledAvsRustSFT()); //

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

  const startSendingMessages = () => {
    if (intervalId) {
      return;
    }

    let isRequestInProgress = false;

    const id = window.setInterval(async () => {
      if (isRequestInProgress) {
        return;
      }

      const conversationState = container.resolve(ConversationState);
      const activeConversation = conversationState?.activeConversation();
      if (!activeConversation) {
        return;
      }

      isRequestInProgress = true;

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
      } finally {
        isRequestInProgress = false;
      }
    }, 100);

    setIntervalId(id);
  };

  // Stop sending messages and reset the counter
  const stopSendingMessages = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
      messageCountRef.current = 0;
    }
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

  const handleAvsRustSftEnable = (isChecked: boolean) => {
    setAvsRustSftEnabled(!!window.wire?.app?.debug?.enableAvsRustSFT(isChecked));
  };
  const renderAvsRustSftSwitch = (value: boolean) => {
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
      <div>{renderConfig(configFeaturesState)}</div>

      <hr />

      <h3>Debug Functions</h3>

      <Button onClick={() => window.wire?.app?.debug?.reconnectWebSocket()}>reconnectWebSocket</Button>
      <Button onClick={() => window.wire?.app?.debug?.enablePressSpaceToUnmute()}>enablePressSpaceToUnmute</Button>
      <Button onClick={() => window.wire?.app?.debug?.disablePressSpaceToUnmute()}>disablePressSpaceToUnmute</Button>

      <div>{renderAvsSwitch(avsDebuggerEnabled)}</div>

      <hr />

      <div>{renderAvsRustSftSwitch(avsRustSftEnabled)}</div>

      <hr />

      <h3>Message Automation</h3>
      <Input
        type="text"
        value={prefix}
        onChange={event => setPrefix(event.currentTarget.value)}
        placeholder="Prefix for the messages"
      />
      <Button onClick={startSendingMessages}>Send Incremented Messages</Button>
      <Button onClick={stopSendingMessages}>Stop Sending Messages</Button>

      <h3>Database dump & restore</h3>
      <h6 style={{color: 'red', fontWeight: 'bold'}}>
        Caution: this is a destructive action and will overwrite existing data. it is supposed to only be used for
        debugging purposes and WILL RESULT in unexpected behavior & fully breaks your client
      </h6>
      <Button onClick={() => window.wire?.app?.debug?.dumpIndexedDB()}>Dump IndexedDB</Button>
      <Button onClick={() => window.wire?.app?.debug?.restoreIndexedDB()}>Restore IndexedDB</Button>
    </div>
  );
}
