/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useState} from 'react';

import {Button, Input} from '@wireapp/react-ui-kit';

import {callLogsServerAddressSchema, useCallLogsUploadSettings} from 'Repositories/calling/callLogsUploadSettings';

export const CallLogsUploadSettings = () => {
  const {mode, serverAddress, setMode, setServerAddress} = useCallLogsUploadSettings();
  const [address, setAddress] = useState(serverAddress);
  const parsedAddress = callLogsServerAddressSchema.safeParse(address);

  return (
    <fieldset style={{margin: 0, border: 0, padding: 0}}>
      <legend style={{fontWeight: 'bold'}}>Call log upload</legend>
      <label htmlFor="call-logs-upload-mode">Upload mode</label>
      <select
        id="call-logs-upload-mode"
        value={mode}
        onChange={event => {
          setMode(event.currentTarget.value === 'server' ? 'server' : 'mock');
        }}
      >
        <option value="mock">Mock (no upload)</option>
        <option value="server">Server (real upload)</option>
      </select>
      <form
        onSubmit={event => {
          event.preventDefault();
          if (parsedAddress.success) {
            setServerAddress(parsedAddress.data);
          }
        }}
      >
        <label htmlFor="call-logs-server-address">Server address</label>
        <Input
          id="call-logs-server-address"
          type="url"
          value={address}
          aria-invalid={!parsedAddress.success}
          onChange={event => {
            setAddress(event.currentTarget.value);
          }}
        />
        {!parsedAddress.success && (
          <p role="alert">Enter an HTTP(S) server address without a path, query or credentials.</p>
        )}
        <Button type="submit" disabled={!parsedAddress.success || parsedAddress.data === serverAddress}>
          Save server address
        </Button>
      </form>
      <p>Active server: {serverAddress}/api/logs</p>
      <p>Changes apply to the next upload and are saved on this browser.</p>
    </fieldset>
  );
};
