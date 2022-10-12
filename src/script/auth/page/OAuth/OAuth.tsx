/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import React, {useEffect} from 'react';
import {useLocation} from 'react-router';
import {useNavigate} from 'react-router-dom';
import {Config} from '../../../Config';
import {getOAuthTokenID, OAuthStateStorage} from 'Util/oauthUtils';

export const OAuth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const state = params.get('state');

  const storedState = OAuthStateStorage.getState();

  const storedStateMatches = state && storedState && state === storedState;

  useEffect(() => {
    if (!code || !storedStateMatches) {
      navigate(Config.getConfig().APP_BASE);
      return;
    }

    getOAuthTokenID(code).then(data => {
      console.info(data);

      //todo: store access token (and refresh token ??)

      //todo: let user in
    });
  }, [code, navigate, storedStateMatches]);

  if (!storedStateMatches) {
    return null;
  }
  return <div>Hello OAuth {code}</div>;
};
