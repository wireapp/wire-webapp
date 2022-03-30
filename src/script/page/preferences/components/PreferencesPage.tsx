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
import {useFadingScrollbar} from '../../../ui/fadingScrollbar';
import {ArrowIcon} from '@wireapp/react-ui-kit';
import {toggleLeftSidebar} from 'Util/util';

interface PreferencesPageProps {
  title: string;
}

const PreferencesPage: React.FC<PreferencesPageProps> = ({title, children}) => {
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

  const openSidebar = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    toggleLeftSidebar(true);
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
      <div className="preferences-titlebar">
        <button onClick={openSidebar} className="preferences-button">
          <ArrowIcon direction="left" color="inherit"></ArrowIcon>
        </button>
        {title}
      </div>
      <div className="preferences-content" ref={setScrollbarRef}>
        {children}
      </div>
    </div>
  );
};

export default PreferencesPage;
