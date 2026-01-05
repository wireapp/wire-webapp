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

import {isAllowedAVSLog} from '../utils/avsFilter';

describe('avsFilter', () => {
  describe('isAllowedAVSLog', () => {
    it('should allow ccall_hash_user messages', () => {
      const message = '@wireapp/webapp/avs: ccall_hash_user called with user data';
      expect(isAllowedAVSLog(message)).toBe(true);
    });

    it('should allow c3_message_recv messages', () => {
      const message = '@wireapp/webapp/avs: c3_message_recv received message';
      expect(isAllowedAVSLog(message)).toBe(true);
    });

    it('should allow c3_message_send messages', () => {
      const message = '@wireapp/webapp/avs: c3_message_send sending message';
      expect(isAllowedAVSLog(message)).toBe(true);
    });

    it('should allow dce_message_recv messages', () => {
      const message = '@wireapp/webapp/avs: dce_message_recv received message';
      expect(isAllowedAVSLog(message)).toBe(true);
    });

    it('should allow dce_message_send messages', () => {
      const message = '@wireapp/webapp/avs: dce_message_send sending message';
      expect(isAllowedAVSLog(message)).toBe(true);
    });

    it('should allow WAPI wcall: create userid messages', () => {
      const message = '@wireapp/webapp/avs: WAPI wcall: create userid';
      expect(isAllowedAVSLog(message)).toBe(true);
    });

    it('should reject other AVS messages', () => {
      const messages = [
        '@wireapp/webapp/avs: some random verbose message',
        '@wireapp/webapp/avs: another debug message',
        '@wireapp/webapp/avs: media stream update',
        '@wireapp/webapp/avs: connection state changed',
      ];

      messages.forEach(message => {
        expect(isAllowedAVSLog(message)).toBe(false);
      });
    });

    it('should reject non-AVS messages', () => {
      const messages = ['Some regular log message', 'Error occurred in application', 'User logged in successfully'];

      messages.forEach(message => {
        expect(isAllowedAVSLog(message)).toBe(false);
      });
    });

    it('should handle empty strings', () => {
      expect(isAllowedAVSLog('')).toBe(false);
    });

    it('should handle messages with partial matches', () => {
      // These should NOT match (need full keyword)
      expect(isAllowedAVSLog('@wireapp/webapp/avs: ccall_hash')).toBe(false);
      expect(isAllowedAVSLog('@wireapp/webapp/avs: hash_user')).toBe(false);
      expect(isAllowedAVSLog('@wireapp/webapp/avs: c3_message')).toBe(false);
    });

    it('should be case-sensitive', () => {
      // These should NOT match (case-sensitive)
      expect(isAllowedAVSLog('@wireapp/webapp/avs: CCALL_HASH_USER')).toBe(false);
      expect(isAllowedAVSLog('@wireapp/webapp/avs: C3_MESSAGE_RECV')).toBe(false);
    });

    it('should match keywords anywhere in message', () => {
      // Keywords can appear anywhere in the message
      expect(isAllowedAVSLog('prefix ccall_hash_user suffix')).toBe(true);
      expect(isAllowedAVSLog('some text c3_message_recv more text')).toBe(true);
    });
  });
});
