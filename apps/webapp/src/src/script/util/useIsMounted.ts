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

import {useCallback, useEffect, useRef} from 'react';

/*
 * Hook to check if a component is mounted.
 * ```
 * const MyComponent = () => {
 *   const [response, setResponse] = useState();
 *
 *   const isMounted = useIsMounted();
 *
 *   const longRunningRequest = async () => {
 *     const response = await fetch('api/request');
 *     if (isMounted()) {
 *       setResponse(response);
 *     }
 *   };
 *
 *   return (
 *     <div onClick={longRunningRequest}>
 *       {response || "click"}
 *     </div>;
 * };
 * ```
 */
export function useIsMounted() {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}
