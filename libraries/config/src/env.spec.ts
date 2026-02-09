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

import * as fs from 'fs';
import * as path from 'path';

describe('Environment files', () => {
  const rootPath = path.resolve(__dirname, '../../../');

  describe('.env.defaults', () => {
    it('should exist in the repository root', () => {
      const envDefaultsPath = path.join(rootPath, '.env.defaults');
      expect(fs.existsSync(envDefaultsPath)).toBe(true);
    });

    it('should be readable', () => {
      const envDefaultsPath = path.join(rootPath, '.env.defaults');
      expect(() => {
        fs.readFileSync(envDefaultsPath, 'utf8');
      }).not.toThrow();
    });

    it('should contain required environment variables', () => {
      const envDefaultsPath = path.join(rootPath, '.env.defaults');
      const content = fs.readFileSync(envDefaultsPath, 'utf8');

      const requiredVars = [
        'APP_BASE',
        'APP_NAME',
        'BACKEND_NAME',
        'BACKEND_REST',
        'BACKEND_WS',
        'BRAND_NAME',
        'ENFORCE_HTTPS',
      ];

      requiredVars.forEach(varName => {
        expect(content).toMatch(new RegExp(`^${varName}=`, 'm'));
      });
    });
  });

  describe('.env.localhost', () => {
    it('should exist in the repository root', () => {
      const envLocalhostPath = path.join(rootPath, '.env.localhost');
      expect(fs.existsSync(envLocalhostPath)).toBe(true);
    });

    it('should be readable', () => {
      const envLocalhostPath = path.join(rootPath, '.env.localhost');
      expect(() => {
        fs.readFileSync(envLocalhostPath, 'utf8');
      }).not.toThrow();
    });

    it('should contain development-specific overrides', () => {
      const envLocalhostPath = path.join(rootPath, '.env.localhost');
      const content = fs.readFileSync(envLocalhostPath, 'utf8');

      expect(content).toMatch(/PORT=/);
      expect(content).toMatch(/APP_BASE=/);
      expect(content).toMatch(/local\.zinfra\.io|localhost/i);
    });

    it('should have FEATURE_ENABLE_DEBUG set to true', () => {
      const envLocalhostPath = path.join(rootPath, '.env.localhost');
      const content = fs.readFileSync(envLocalhostPath, 'utf8');

      expect(content).toMatch(/FEATURE_ENABLE_DEBUG="true"/);
    });
  });

  describe('Environment file location', () => {
    it('should not have .env files in libraries/config directory', () => {
      const oldConfigPath = path.join(rootPath, 'libraries/config');
      const envInConfig = fs.existsSync(path.join(oldConfigPath, '.env'));
      const envLocalhostInConfig = fs.existsSync(path.join(oldConfigPath, '.env.localhost'));

      expect(envInConfig).toBe(false);
      expect(envLocalhostInConfig).toBe(false);
    });
  });
});
