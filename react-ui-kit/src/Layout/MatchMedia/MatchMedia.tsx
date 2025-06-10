/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {ReactFragment, useEffect, useMemo, useState} from 'react';
import * as React from 'react';

import {QUERY, QueryKeys} from '../../utils';

type Query = string | QueryKeys;

export interface MatchMediaProps extends React.HTMLProps<ReactFragment> {
  not?: boolean;
  query: Query;
}

export const useMatchMedia = (query: Query, customWindowObj?: Window) => {
  const windowObj = customWindowObj || window;
  const matchMedia = useMemo(() => windowObj.matchMedia(`(${query})`), [query, windowObj]);

  const [isMatching, setIsMatching] = useState(matchMedia.matches);

  const updateMatching = (event: MediaQueryListEvent | MediaQueryList) => {
    setIsMatching(event.matches);
  };

  useEffect(() => {
    // update isMatching when matchMedia (or customWindowObj) change
    updateMatching(matchMedia);
    matchMedia.addEventListener('change', updateMatching);
    return () => matchMedia.removeEventListener('change', updateMatching);
  }, [matchMedia]);

  return isMatching;
};

export const MatchMedia: React.FC<MatchMediaProps> = ({query, children, not}) => {
  const matchQuery = useMatchMedia(QUERY[query] || query);
  const isMatching = not ? !matchQuery : matchQuery;
  return isMatching ? <>{children}</> : null;
};

export type NamedMatchMediaProps = Omit<MatchMediaProps, 'query'>;

export const IsDesktop = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.DESKTOP} {...props} />;
export const IsDesktopXL = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.DESKTOP_XL} {...props} />;
export const IsMobile = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.MOBILE} {...props} />;
export const IsMobileDown = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.MOBILE_DOWN} {...props} />;
export const IsMobileUp = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.MOBILE_UP} {...props} />;
export const IsTablet = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.TABLET} {...props} />;
export const IsTabletDown = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.TABLET_DOWN} {...props} />;
export const IsTabletUp = (props: NamedMatchMediaProps) => <MatchMedia query={QueryKeys.TABLET_UP} {...props} />;
