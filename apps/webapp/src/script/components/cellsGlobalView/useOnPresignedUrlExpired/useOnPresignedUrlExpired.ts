/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useDatePassed} from 'Hooks/useDatePassed/useDatePassed';

import {useCellsStore} from '../common/useCellsStore/useCellsStore';

// Every node has a url to its destination, which expires after some time.
// When the url expires, we need to refresh the nodes to get the new url.
// If we don't refresh the nodes, the user will see a broken image.
export const useOnPresignedUrlExpired = ({refreshCallback}: {refreshCallback: () => void}) => {
  const {nodes} = useCellsStore();

  const nodesAvailable = nodes.length > 0;

  useDatePassed({
    enabled: nodesAvailable,
    target: nodesAvailable ? nodes[0].presignedUrlExpiresAt : null,
    callback: refreshCallback,
  });
};
