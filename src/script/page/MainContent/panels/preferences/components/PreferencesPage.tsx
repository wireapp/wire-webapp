/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React from 'react';
import useEffectRef from 'Util/useEffectRef';
import {useFadingScrollbar} from '../../../../../ui/fadingScrollbar';

interface PreferencesPageProps {
  children: React.ReactNode;
  title: string;
}

const PreferencesPage: React.FC<PreferencesPageProps> = ({title, children}) => {
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
      <h2 className="preferences-titlebar">{title}</h2>
      <div className="preferences-content" ref={setScrollbarRef}>
        {children}
      </div>
    </div>
  );
};

export default PreferencesPage;
