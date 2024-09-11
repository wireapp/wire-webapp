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

import {Input, Switch} from '@wireapp/react-ui-kit';

import {Config, Configuration} from 'src/script/Config';
import {useClickOutside} from 'src/script/hooks/useClickOutside';

export function ConfigToolbar() {
  const [showConfig, setShowConfig] = useState(false);
  const [configFeaturesState, setConfigFeaturesState] = useState<Configuration['FEATURE']>(Config.getConfig().FEATURE);
  const wrapperRef = useRef(null);

  // Toggle config tool on 'cmd/ctrl + shift + 2'
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === '2') {
        setShowConfig(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

    // Separate the FEATURE key and other keys
    const featureEntry = entries.find(([key]) => key === 'FEATURE');
    const otherEntries = entries.filter(([key]) => key !== 'FEATURE');

    // Put FEATURE key first, followed by other keys
    const sortedEntries = featureEntry ? [featureEntry, ...otherEntries] : otherEntries;

    return sortedEntries.map(([key, value]) => {
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

  if (!showConfig) {
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '400px',
        height: '100vh',
        backgroundColor: '#f4f4f4',
        padding: '20px',
        overflow: 'auto',
        zIndex: 100000000,
      }}
    >
      <h3>Configuration Tool</h3>
      <h4 style={{color: 'red', fontWeight: 'bold'}}>
        Caution: Modifying these settings can affect the behavior of the application. Ensure you understand the
        implications of each change before proceeding. Changes may cause unexpected behavior.
      </h4>
      <div>{renderConfig(configFeaturesState)}</div>
    </div>
  );
}
