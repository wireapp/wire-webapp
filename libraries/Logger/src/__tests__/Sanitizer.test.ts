/**
 * Comprehensive tests for the Sanitizer class
 * Tests all sanitization rules to ensure no data leaks occur
 */

import {Sanitizer} from '../sanitization/Sanitizer';
import {LogEntry, LogLevel, SafetyLevel, LogMetadata, LogContext} from '../types';

describe('Sanitizer', () => {
  let sanitizer: Sanitizer;
  let baseMetadata: LogMetadata;

  beforeEach(() => {
    sanitizer = new Sanitizer();
    baseMetadata = {
      timestamp: '2025-12-29T10:00:00.000Z',
      environment: 'development',
      platform: 'browser',
      logger: 'test-logger',
    };
  });

  describe('UUID Masking', () => {
    it('should mask full UUIDs in SANITIZED mode', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'User with UUID 123e4567-e89b-12d3-a456-426614174000 logged in',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('123e4567***');
      expect(sanitized.message).not.toContain('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should preserve UUIDs in DEV_ONLY mode', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: `User with UUID ${uuid} logged in`,
        metadata: baseMetadata,
        isProductionSafe: false,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.DEV_ONLY);

      expect(sanitized.message).toContain(uuid);
    });

    it('should mask UUIDs in context values', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Processing request',
        context: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          conversationId: '987f6543-e21b-43d2-b876-532615173999',
        },
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.context?.userId).toBe('123e4567***');
      expect(sanitized.context?.conversationId).toBe('987f6543***');
    });

    it('should handle multiple UUIDs in message', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'User 123e4567-e89b-12d3-a456-426614174000 sent message to 987f6543-e21b-43d2-b876-532615173999',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('123e4567***');
      expect(sanitized.message).toContain('987f6543***');
    });
  });

  describe('Email Masking', () => {
    it('should mask email addresses in SANITIZED mode', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'User alice@example.com logged in',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[EMAIL]');
      expect(sanitized.message).not.toContain('alice@example.com');
    });

    it('should mask emails with special characters', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Contact user.name+tag@example.com',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[EMAIL]');
      expect(sanitized.message).not.toContain('user.name+tag@example.com');
    });

    it('should mask emails in context values', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'User registration',
        context: {
          email: 'bob.smith@company.co.uk',
        },
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.context?.email).toBe('[EMAIL]');
    });
  });

  describe('Phone Number Masking', () => {
    it('should mask phone numbers with country code', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Call to +1 (555) 123-4567',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[PHONE]');
      expect(sanitized.message).not.toContain('+1 (555) 123-4567');
    });

    it('should mask phone numbers without country code', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Call to 555-123-4567',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[PHONE]');
      expect(sanitized.message).not.toContain('555-123-4567');
    });
  });

  describe('Access Token Masking', () => {
    it('should mask Bearer tokens in SANITIZED mode', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('Bearer [TOKEN]');
      expect(sanitized.message).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should mask Bearer tokens in SAFE mode', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SAFE);

      expect(sanitized.message).toContain('Bearer [TOKEN]');
    });
  });

  describe('Message Content Masking', () => {
    it('should mask content in message', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Message sent with content: "Hello, how are you?"',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[MESSAGE_CONTENT]');
      expect(sanitized.message).not.toContain('Hello, how are you?');
    });

    it('should mask text in message', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Message with text: "Secret message here"',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[MESSAGE_CONTENT]');
      expect(sanitized.message).not.toContain('Secret message here');
    });

    it('should mask message in context', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Processing message',
        context: {
          message: 'Hello world',
        },
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.context?.message).toContain('[MESSAGE_CONTENT]');
      expect(sanitized.context?.message).not.toContain('Hello world');
    });

    it('should not mask content in non-whitelisted keys', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Processing message',
        context: {
          myMessage: 'Hello world',
        },
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.context?.myMessage).toBe('Hello world');
    });
  });

  describe('Encryption Key Masking', () => {
    it('should mask keys in message', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Generated key: "0x1234567890abcdef"',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[ENCRYPTED]');
      expect(sanitized.message).not.toContain('0x1234567890abcdef');
    });

    it('should mask secrets in message', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Secret: "my-secret-key-123"',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[ENCRYPTED]');
      expect(sanitized.message).not.toContain('my-secret-key-123');
    });

    it('should mask private in context', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Generating key',
        context: {
          private: '0xabcdef123456',
        },
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.context?.private).toContain('[ENCRYPTED]');
      expect(sanitized.context?.private).not.toContain('0xabcdef123456');
    });
  });

  describe('URL Masking', () => {
    it('should mask non-whitelisted URLs', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Request to https://example.com/api/users',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[URL]');
      expect(sanitized.message).not.toContain('https://example.com/api/users');
    });

    it('should preserve whitelisted Wire URLs', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Request to https://wire.com/api/users',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('https://wire.com/api/users');
      expect(sanitized.message).not.toContain('[URL]');
    });

    it('should preserve whitelisted Zinfra URLs', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Request to https://nginz-https.zinfra.io/api',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('https://nginz-https.zinfra.io/api');
      expect(sanitized.message).not.toContain('[URL]');
    });

    it('should preserve Datadog URLs', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Sending to https://datadoghq.com/logs',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('https://datadoghq.com/logs');
      expect(sanitized.message).not.toContain('[URL]');
    });
  });

  describe('Stack Trace Sanitization', () => {
    it('should sanitize stack traces in SANITIZED mode', () => {
      const error = new Error('Test error');
      error.stack = `Error: Test error
    at Object.<anonymous> (/app/src/components/Component.tsx:45:12)
    at render (/app/src/utils/render.ts:123:8)
    at App (/app/src/App.tsx:67:15)`;

      const entry: LogEntry = {
        level: LogLevel.ERROR,
        message: 'Error occurred',
        error,
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.error?.stack).toContain('[STACK_FRAME]');
      expect(sanitized.error?.stack).not.toContain('/app/src/');
    });

    it('should preserve stack traces in DEV_ONLY mode', () => {
      const error = new Error('Test error');
      error.stack = `Error: Test error
    at Object.<anonymous> (/app/src/components/Component.tsx:45:12)`;

      const entry: LogEntry = {
        level: LogLevel.ERROR,
        message: 'Error occurred',
        error,
        metadata: baseMetadata,
        isProductionSafe: false,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.DEV_ONLY);

      expect(sanitized.error?.stack).toContain('/app/src/components/Component.tsx');
    });
  });

  describe('Credit Card Masking (PCI-DSS)', () => {
    it('should mask Visa card numbers', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Payment with card 4111111111111111',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[CREDIT_CARD]');
      expect(sanitized.message).not.toContain('4111111111111111');
    });

    it('should mask MasterCard numbers', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Payment with card 5500000000000004',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[CREDIT_CARD]');
      expect(sanitized.message).not.toContain('5500000000000004');
    });

    it('should mask credit cards in SAFE mode', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Payment with card 4111111111111111',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SAFE);

      expect(sanitized.message).toContain('[CREDIT_CARD]');
    });
  });

  describe('IP Address Masking', () => {
    it('should mask IPv4 addresses', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Connection from 192.168.1.1',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).toContain('[IP_ADDRESS]');
      expect(sanitized.message).not.toContain('192.168.1.1');
    });

    it('should mask IP addresses in context', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Connection established',
        context: {
          remoteIp: '10.0.0.1',
        },
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.context?.remoteIp).toBe('[IP_ADDRESS]');
    });

    it('should not mask non-IP numbers', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Version 1.2.3 released',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).not.toContain('[IP_ADDRESS]');
      expect(sanitized.message).toContain('1.2.3');
    });
  });

  describe('Object Dump Sanitization', () => {
    it('should mask object dumps in DEV_ONLY mode', () => {
      const entry: LogEntry = {
        level: LogLevel.DEBUG,
        message: 'State dump: {user: {id: 123, name: "Alice"}}',
        metadata: baseMetadata,
        isProductionSafe: false,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.DEV_ONLY);

      expect(sanitized.message).toContain('[OBJECT_DUMP]');
      expect(sanitized.message).not.toContain('{user:');
    });

    it('should mask error objects in DEV_ONLY mode', () => {
      const entry: LogEntry = {
        level: LogLevel.ERROR,
        message: 'Error occurred: {code: 500, message: "Internal error"}',
        metadata: baseMetadata,
        isProductionSafe: false,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.DEV_ONLY);

      expect(sanitized.message).toContain('[ERROR_OBJECT]');
      expect(sanitized.message).not.toContain('{code:');
    });
  });

  describe('Nested Object Sanitization', () => {
    it('should sanitize nested objects in context', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Processing request',
        context: {
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'alice@example.com',
          },
          request: {
            url: 'https://example.com/api',
          },
        },
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.context?.user?.id).toBe('123e4567***');
      expect(sanitized.context?.user?.email).toBe('[EMAIL]');
      expect(sanitized.context?.request?.url).toBe('[URL]');
    });

    it('should sanitize arrays in context', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Processing users',
        context: {
          users: [
            {id: '123e4567-e89b-12d3-a456-426614174000', email: 'alice@example.com'},
            {id: '987f6543-e21b-43d2-b876-532615173999', email: 'bob@example.com'},
          ],
        },
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.context?.users[0].id).toBe('123e4567***');
      expect(sanitized.context?.users[0].email).toBe('[EMAIL]');
      expect(sanitized.context?.users[1].id).toBe('987f6543***');
      expect(sanitized.context?.users[1].email).toBe('[EMAIL]');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty context', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test message',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.context).toBeUndefined();
    });

    it('should handle undefined error', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test message',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.error).toBeUndefined();
    });

    it('should handle error without stack', () => {
      const error = new Error('Test error');
      delete (error as any).stack;

      const entry: LogEntry = {
        level: LogLevel.ERROR,
        message: 'Error occurred',
        error,
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.error?.message).toBe('Test error');
      expect(sanitized.error?.stack).toBeUndefined();
    });

    it('should handle mixed data types in context', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test message',
        context: {
          string: '123e4567-e89b-12d3-a456-426614174000',
          number: 123,
          boolean: true,
          null: null,
          undefined: undefined,
        },
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.context?.string).toBe('123e4567***');
      expect(sanitized.context?.number).toBe(123);
      expect(sanitized.context?.boolean).toBe(true);
      expect(sanitized.context?.null).toBeNull();
      expect(sanitized.context?.undefined).toBeUndefined();
    });
  });

  describe('Data Leak Prevention', () => {
    it('should never leak UUIDs in production logs', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: `User ${uuid} logged in`,
        context: {userId: uuid},
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).not.toContain(uuid);
      expect(sanitized.context?.userId).not.toContain(uuid);
    });

    it('should never leak emails in production logs', () => {
      const email = 'alice@example.com';
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: `User ${email} logged in`,
        context: {email},
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).not.toContain(email);
      expect(sanitized.context?.email).not.toContain(email);
    });

    it('should never leak tokens in production logs', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: `Authorization: Bearer ${token}`,
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).not.toContain(token);
    });

    it('should never leak message content in production logs', () => {
      const content = 'Hello, this is a secret message';
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: `Message sent with content: "${content}"`,
        context: {content},
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).not.toContain(content);
      expect(sanitized.context?.content).not.toContain(content);
    });

    it('should never leak encryption keys in production logs', () => {
      const key = '0x1234567890abcdef';
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: `Generated key: "${key}"`,
        context: {privateKey: key},
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).not.toContain(key);
      expect(sanitized.context?.privateKey).not.toContain(key);
    });

    it('should never leak IP addresses in production logs', () => {
      const ip = '192.168.1.1';
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: `Connection from ${ip}`,
        context: {remoteIp: ip},
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).not.toContain(ip);
      expect(sanitized.context?.remoteIp).not.toContain(ip);
    });

    it('should never leak credit card numbers in production logs', () => {
      const card = '4111111111111111';
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: `Payment with card ${card}`,
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SANITIZED);

      expect(sanitized.message).not.toContain(card);
    });
  });

  describe('Safe Mode', () => {
    it('should apply critical sanitization in SAFE mode', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9, Card: 4111111111111111',
        metadata: baseMetadata,
        isProductionSafe: true,
      };

      const sanitized = sanitizer.sanitize(entry, SafetyLevel.SAFE);

      expect(sanitized.message).toContain('Bearer [TOKEN]');
      expect(sanitized.message).toContain('[CREDIT_CARD]');
      expect(sanitized.message).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized.message).not.toContain('4111111111111111');
    });
  });
});
