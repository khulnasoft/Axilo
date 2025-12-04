import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiKeyManager } from '../src/utils/config';

// Mock the logger to prevent actual logging during tests
vi.mock('../src/utils/agent/log.js', () => ({
  log: vi.fn(),
  isLoggingEnabled: () => true,
}));

describe('ApiKeyManager', () => {
  // Save and restore the original instance state
  let originalApiKey: string | null;
  let originalIsSet: boolean;
  
  beforeEach(() => {
    // Save the original state
    originalApiKey = apiKeyManager['apiKey'];
    originalIsSet = apiKeyManager['isSet'];
    
    // Reset the instance state
    apiKeyManager['apiKey'] = '';
    apiKeyManager['isSet'] = false;
    apiKeyManager['lastUsed'] = 0;
    apiKeyManager['usageCount'] = 0;
    
    // Clear all mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore the original state
    apiKeyManager['apiKey'] = originalApiKey || '';
    apiKeyManager['isSet'] = originalIsSet;
  });

  describe('setApiKey', () => {
    it('should set a valid API key', () => {
      const testKey = 'test-api-key-123';
      apiKeyManager.setApiKey(testKey);
      
      expect(apiKeyManager.hasApiKey()).toBe(true);
      expect(apiKeyManager.getApiKey()).toBe(testKey);
    });
    
    it('should throw an error for empty API key', () => {
      expect(() => apiKeyManager.setApiKey('')).toThrow('API key must be a non-empty string');
      expect(() => apiKeyManager.setApiKey('   ')).toThrow('API key must be a non-empty string');
    });
    
    it('should reset usage counter when setting a new key', () => {
      // Set initial key and simulate some usage
      apiKeyManager.setApiKey('initial-key');
      apiKeyManager['usageCount'] = 5;
      
      // Set a new key
      apiKeyManager.setApiKey('new-key');
      
      expect(apiKeyManager['usageCount']).toBe(0);
      expect(apiKeyManager.getApiKey()).toBe('new-key');
    });
  });
  
  describe('rotateApiKey', () => {
    it('should rotate to a new API key and return the old one', () => {
      const oldKey = 'old-key-123';
      const newKey = 'new-key-456';
      
      apiKeyManager.setApiKey(oldKey);
      const returnedKey = apiKeyManager.rotateApiKey(newKey);
      
      expect(returnedKey).toBe(oldKey);
      // getApiKey() increments the counter, so it should be 1 after this call
      expect(apiKeyManager.getApiKey()).toBe(newKey);
      expect(apiKeyManager['usageCount']).toBe(1); // 1 because getApiKey() was called
    });
    
    it('should handle rotation when no key was set before', () => {
      const newKey = 'new-key-456';
      const returnedKey = apiKeyManager.rotateApiKey(newKey);
      
      expect(returnedKey).toBeNull();
      expect(apiKeyManager.getApiKey()).toBe(newKey);
    });
    
    it('should throw an error for empty new key', () => {
      expect(() => apiKeyManager.rotateApiKey('')).toThrow('New API key must be a non-empty string');
    });
  });
  
  describe('rate limiting', () => {
    const RATE_LIMIT = 100;
    const TEST_KEY = 'test-rate-limit-key';
    
    it('should allow requests within rate limit', () => {
      apiKeyManager.setApiKey(TEST_KEY);
      
      // Make RATE_LIMIT requests (should all succeed)
      for (let i = 0; i < RATE_LIMIT; i++) {
        expect(apiKeyManager.getApiKey()).toBe(TEST_KEY);
      }
    });
    
    it('should throw when rate limit is exceeded', () => {
      apiKeyManager.setApiKey(TEST_KEY);
      
      // Make RATE_LIMIT + 1 requests
      for (let i = 0; i < RATE_LIMIT; i++) {
        apiKeyManager.getApiKey();
      }
      
      // Next request should throw
      expect(() => apiKeyManager.getApiKey()).toThrow(/API rate limit exceeded/);
    });
    
    it('should reset rate limit after window expires', () => {
      const now = Date.now();
      vi.useFakeTimers();
      vi.setSystemTime(now);
      
      apiKeyManager.setApiKey(TEST_KEY);
      
      // Use up the rate limit
      for (let i = 0; i < RATE_LIMIT; i++) {
        apiKeyManager.getApiKey();
      }
      
      // Fast-forward time to just before the window expires
      vi.setSystemTime(now + 59000); // 59 seconds
      expect(() => apiKeyManager.getApiKey()).toThrow();
      
      // Fast-forward past the window
      vi.setSystemTime(now + 61000); // 61 seconds
      
      // Should now allow requests again
      expect(apiKeyManager.getApiKey()).toBe(TEST_KEY);
      
      vi.useRealTimers();
    });
  });
  
  describe('key fingerprinting', () => {
    it('should generate consistent fingerprints for the same key', () => {
      const key1 = 'test-key-123';
      const key2 = 'test-key-123';
      const key3 = 'different-key-456';
      
      apiKeyManager.setApiKey(key1);
      const fp1 = apiKeyManager['getKeyFingerprint']();
      
      apiKeyManager.setApiKey(key2);
      const fp2 = apiKeyManager['getKeyFingerprint']();
      
      apiKeyManager.setApiKey(key3);
      const fp3 = apiKeyManager['getKeyFingerprint']();
      
      expect(fp1).toBe(fp2);
      expect(fp1).not.toBe(fp3);
      expect(fp1).not.toBe('test-key-123'); // Should not expose the actual key
      expect(fp1).toMatch(/^fp_[a-f0-9]+$/); // Should match fingerprint format
    });
  });
  
  describe('clearApiKey', () => {
    it('should clear the API key and reset state', () => {
      apiKeyManager.setApiKey('test-key');
      apiKeyManager['usageCount'] = 5;
      
      apiKeyManager.clearApiKey();
      
      expect(apiKeyManager.hasApiKey()).toBe(false);
      expect(apiKeyManager.getApiKey()).toBeNull();
      expect(apiKeyManager['usageCount']).toBe(0);
    });
  });
});
