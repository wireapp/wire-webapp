/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {Container} from '@wireapp/react-ui-kit';
import React, {useEffect, useState} from 'react';

export const RenderHarness = ({children}) => {
  const INTERVAL_MS = 1000;
  const [time, setTime] = useState(new Date().getTime());
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTime(new Date().getTime());
    }, INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <Container>
      {new Date(time).toString()}
      {children}
    </Container>
  );
};
