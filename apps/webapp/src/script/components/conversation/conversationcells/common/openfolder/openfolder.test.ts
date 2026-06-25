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

import {openFolder} from './openfolder';

const CONV_ID = 'abc-123';
const DOMAIN = 'staging.zinfra.io';

function currentHash(): string {
  return window.location.hash.replace('#', '');
}

describe('openFolder', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  describe('absolute path (id@domain)', () => {
    it('navigates to the folder when path has one level', () => {
      openFolder({path: `${CONV_ID}@${DOMAIN}/Test`});

      expect(currentHash()).toBe(`/conversation/${CONV_ID}/${DOMAIN}/files/Test`);
    });

    it('navigates to the correct nested folder', () => {
      openFolder({path: `${CONV_ID}@${DOMAIN}/Test/2025/deep`});

      expect(currentHash()).toBe(`/conversation/${CONV_ID}/${DOMAIN}/files/Test/2025/deep`);
    });

    it('encodes path segments with special characters', () => {
      openFolder({path: `${CONV_ID}@${DOMAIN}/My Folder/Sub Folder`});

      expect(currentHash()).toBe(`/conversation/${CONV_ID}/${DOMAIN}/files/My%20Folder/Sub%20Folder`);
    });

    it('calls onBeforeNavigate before changing the URL', () => {
      const hashBeforeNavigate: string[] = [];
      const onBeforeNavigate = () => hashBeforeNavigate.push(currentHash());

      openFolder({path: `${CONV_ID}@${DOMAIN}/Test`, onBeforeNavigate});

      expect(hashBeforeNavigate).toEqual(['']);
      expect(currentHash()).toContain('/files/Test');
    });
  });
});
