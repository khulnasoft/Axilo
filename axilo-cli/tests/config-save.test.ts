import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { load as loadYaml } from 'js-yaml';
import type { AppConfig, StoredConfig } from '../src/utils/config';
import { FullAutoErrorMode } from '../src/utils/auto-approval-mode';

// Import the functions we're testing
import { saveConfig, loadConfig } from '../src/utils/config';

describe('saveConfig - memory and fullAutoErrorMode persistence', () => {
  let testDir: string;
  let configPath: string;
  let instructionsPath: string;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = join(tmpdir(), `axilo-test-${Date.now()}-${Math.random()}`);
    mkdirSync(testDir, { recursive: true });
    configPath = join(testDir, 'config.json');
    instructionsPath = join(testDir, 'instructions.md');
  });

  afterEach(() => {
    // Clean up the test directory
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('JSON format', () => {
    it('should save model, memory, and fullAutoErrorMode to JSON when all are present', () => {
      const config: AppConfig = {
        model: 'gpt-4',
        instructions: 'Test instructions',
        memory: { enabled: true },
        fullAutoErrorMode: FullAutoErrorMode.ASK_USER,
      };

      saveConfig(config, configPath, instructionsPath);

      expect(existsSync(configPath)).toBe(true);
      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.model).toBe('gpt-4');
      expect(parsed.memory).toEqual({ enabled: true });
      expect(parsed.fullAutoErrorMode).toBe(FullAutoErrorMode.ASK_USER);
    });

    it('should save only model when memory and fullAutoErrorMode are undefined', () => {
      const config: AppConfig = {
        model: 'o4-mini',
        instructions: 'Test instructions',
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.model).toBe('o4-mini');
      expect(parsed.memory).toBeUndefined();
      expect(parsed.fullAutoErrorMode).toBeUndefined();
      expect(Object.keys(parsed)).toEqual(['model']);
    });

    it('should save model and memory when memory is present but fullAutoErrorMode is not', () => {
      const config: AppConfig = {
        model: 'gpt-4.1',
        instructions: 'Test instructions',
        memory: { enabled: false },
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.model).toBe('gpt-4.1');
      expect(parsed.memory).toEqual({ enabled: false });
      expect(parsed.fullAutoErrorMode).toBeUndefined();
    });

    it('should save model and fullAutoErrorMode when fullAutoErrorMode is present but memory is not', () => {
      const config: AppConfig = {
        model: 'claude-3',
        instructions: 'Test instructions',
        fullAutoErrorMode: FullAutoErrorMode.IGNORE_AND_CONTINUE,
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.model).toBe('claude-3');
      expect(parsed.memory).toBeUndefined();
      expect(parsed.fullAutoErrorMode).toBe(FullAutoErrorMode.IGNORE_AND_CONTINUE);
    });

    it('should handle memory with enabled: true', () => {
      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Test',
        memory: { enabled: true },
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.memory).toEqual({ enabled: true });
    });

    it('should handle memory with enabled: false', () => {
      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Test',
        memory: { enabled: false },
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.memory).toEqual({ enabled: false });
    });

    it('should format JSON with proper indentation', () => {
      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Test',
        memory: { enabled: true },
        fullAutoErrorMode: FullAutoErrorMode.ASK_USER,
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      
      // Verify JSON is pretty-printed with 2 space indentation
      expect(savedContent).toContain('  "model"');
      expect(savedContent).toContain('  "memory"');
      expect(savedContent).toContain('  "fullAutoErrorMode"');
    });

    it('should save instructions to separate file', () => {
      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Custom instructions for testing',
        memory: { enabled: true },
      };

      saveConfig(config, configPath, instructionsPath);

      expect(existsSync(instructionsPath)).toBe(true);
      const instructions = readFileSync(instructionsPath, 'utf-8');
      expect(instructions).toBe('Custom instructions for testing');
    });

    it('should create directory if it does not exist', () => {
      const nestedDir = join(testDir, 'nested', 'deeply', 'config.json');
      const nestedInstr = join(testDir, 'nested', 'deeply', 'instructions.md');

      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Test',
        memory: { enabled: true },
      };

      saveConfig(config, nestedDir, nestedInstr);

      expect(existsSync(nestedDir)).toBe(true);
      expect(existsSync(nestedInstr)).toBe(true);
    });
  });

  describe('YAML format', () => {
    beforeEach(() => {
      configPath = join(testDir, 'config.yaml');
    });

    it('should save model, memory, and fullAutoErrorMode to YAML when all are present', () => {
      const config: AppConfig = {
        model: 'gpt-4',
        instructions: 'Test instructions',
        memory: { enabled: true },
        fullAutoErrorMode: FullAutoErrorMode.ASK_USER,
      };

      saveConfig(config, configPath, instructionsPath);

      expect(existsSync(configPath)).toBe(true);
      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = loadYaml(savedContent) as StoredConfig;

      expect(parsed.model).toBe('gpt-4');
      expect(parsed.memory).toEqual({ enabled: true });
      expect(parsed.fullAutoErrorMode).toBe(FullAutoErrorMode.ASK_USER);
    });

    it('should save only model to YAML when memory and fullAutoErrorMode are undefined', () => {
      const config: AppConfig = {
        model: 'o4-mini',
        instructions: 'Test instructions',
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = loadYaml(savedContent) as StoredConfig;

      expect(parsed.model).toBe('o4-mini');
      expect(parsed.memory).toBeUndefined();
      expect(parsed.fullAutoErrorMode).toBeUndefined();
    });

    it('should save model and memory to YAML when memory is present but fullAutoErrorMode is not', () => {
      const config: AppConfig = {
        model: 'gpt-4.1',
        instructions: 'Test instructions',
        memory: { enabled: false },
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = loadYaml(savedContent) as StoredConfig;

      expect(parsed.model).toBe('gpt-4.1');
      expect(parsed.memory).toEqual({ enabled: false });
      expect(parsed.fullAutoErrorMode).toBeUndefined();
    });

    it('should save model and fullAutoErrorMode to YAML when fullAutoErrorMode is present but memory is not', () => {
      const config: AppConfig = {
        model: 'claude-3',
        instructions: 'Test instructions',
        fullAutoErrorMode: FullAutoErrorMode.IGNORE_AND_CONTINUE,
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = loadYaml(savedContent) as StoredConfig;

      expect(parsed.model).toBe('claude-3');
      expect(parsed.memory).toBeUndefined();
      expect(parsed.fullAutoErrorMode).toBe(FullAutoErrorMode.IGNORE_AND_CONTINUE);
    });

    it('should handle .yml extension', () => {
      const ymlPath = join(testDir, 'config.yml');
      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Test',
        memory: { enabled: true },
        fullAutoErrorMode: FullAutoErrorMode.ASK_USER,
      };

      saveConfig(config, ymlPath, instructionsPath);

      expect(existsSync(ymlPath)).toBe(true);
      const savedContent = readFileSync(ymlPath, 'utf-8');
      const parsed = loadYaml(savedContent) as StoredConfig;

      expect(parsed.model).toBe('test-model');
      expect(parsed.memory).toEqual({ enabled: true });
      expect(parsed.fullAutoErrorMode).toBe(FullAutoErrorMode.ASK_USER);
    });

    it('should produce valid YAML format', () => {
      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Test',
        memory: { enabled: true },
        fullAutoErrorMode: FullAutoErrorMode.ASK_USER,
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      
      // Verify YAML structure (should contain keys without quotes in typical YAML format)
      expect(savedContent).toContain('model:');
      expect(savedContent).toContain('memory:');
      expect(savedContent).toContain('enabled:');
      expect(savedContent).toContain('fullAutoErrorMode:');
    });
  });

  describe('round-trip consistency', () => {
    it('should preserve memory and fullAutoErrorMode through save/load cycle (JSON)', () => {
      const originalConfig: AppConfig = {
        model: 'test-model',
        instructions: 'Original instructions',
        memory: { enabled: true },
        fullAutoErrorMode: FullAutoErrorMode.ASK_USER,
      };

      saveConfig(originalConfig, configPath, instructionsPath);
      const loadedConfig = loadConfig(configPath, instructionsPath, { 
        disableProjectDoc: true 
      });

      expect(loadedConfig.model).toBe(originalConfig.model);
      expect(loadedConfig.memory).toEqual(originalConfig.memory);
      expect(loadedConfig.fullAutoErrorMode).toBe(originalConfig.fullAutoErrorMode);
    });

    it('should preserve memory and fullAutoErrorMode through save/load cycle (YAML)', () => {
      const yamlPath = join(testDir, 'config.yaml');
      const originalConfig: AppConfig = {
        model: 'test-model',
        instructions: 'Original instructions',
        memory: { enabled: false },
        fullAutoErrorMode: FullAutoErrorMode.IGNORE_AND_CONTINUE,
      };

      saveConfig(originalConfig, yamlPath, instructionsPath);
      const loadedConfig = loadConfig(yamlPath, instructionsPath, { 
        disableProjectDoc: true 
      });

      expect(loadedConfig.model).toBe(originalConfig.model);
      expect(loadedConfig.memory).toEqual(originalConfig.memory);
      expect(loadedConfig.fullAutoErrorMode).toBe(originalConfig.fullAutoErrorMode);
    });

    it('should not add memory or fullAutoErrorMode if they were not in the original config', () => {
      const originalConfig: AppConfig = {
        model: 'test-model',
        instructions: 'Original instructions',
      };

      saveConfig(originalConfig, configPath, instructionsPath);
      const loadedConfig = loadConfig(configPath, instructionsPath, { 
        disableProjectDoc: true 
      });

      expect(loadedConfig.model).toBe(originalConfig.model);
      expect(loadedConfig.memory).toBeUndefined();
      expect(loadedConfig.fullAutoErrorMode).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string model', () => {
      const config: AppConfig = {
        model: '',
        instructions: 'Test',
        memory: { enabled: true },
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.model).toBe('');
      expect(parsed.memory).toEqual({ enabled: true });
    });

    it('should handle empty instructions', () => {
      const config: AppConfig = {
        model: 'test-model',
        instructions: '',
        memory: { enabled: true },
      };

      saveConfig(config, configPath, instructionsPath);

      const instructions = readFileSync(instructionsPath, 'utf-8');
      expect(instructions).toBe('');
    });

    it('should handle both fullAutoErrorMode enum values', () => {
      const modes = [
        FullAutoErrorMode.ASK_USER,
        FullAutoErrorMode.IGNORE_AND_CONTINUE,
      ];
      
      for (const mode of modes) {
        const config: AppConfig = {
          model: 'test-model',
          instructions: 'Test',
          fullAutoErrorMode: mode,
        };

        const testPath = join(testDir, `config-${mode}.json`);
        saveConfig(config, testPath, instructionsPath);

        const savedContent = readFileSync(testPath, 'utf-8');
        const parsed = JSON.parse(savedContent) as StoredConfig;

        expect(parsed.fullAutoErrorMode).toBe(mode);
      }
    });

    it('should overwrite existing config file', () => {
      const config1: AppConfig = {
        model: 'model-1',
        instructions: 'Instructions 1',
        memory: { enabled: true },
      };

      saveConfig(config1, configPath, instructionsPath);

      const config2: AppConfig = {
        model: 'model-2',
        instructions: 'Instructions 2',
        fullAutoErrorMode: FullAutoErrorMode.ASK_USER,
      };

      saveConfig(config2, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.model).toBe('model-2');
      expect(parsed.memory).toBeUndefined();
      expect(parsed.fullAutoErrorMode).toBe(FullAutoErrorMode.ASK_USER);
    });

    it('should handle special characters in instructions', () => {
      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Instructions with "quotes" and \n newlines \t tabs',
        memory: { enabled: true },
      };

      saveConfig(config, configPath, instructionsPath);

      const instructions = readFileSync(instructionsPath, 'utf-8');
      expect(instructions).toBe(config.instructions);
    });

    it('should handle unicode in model names', () => {
      const config: AppConfig = {
        model: 'test-模型-🤖',
        instructions: 'Test',
        memory: { enabled: true },
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.model).toBe('test-模型-🤖');
    });
  });

  describe('format preservation', () => {
    it('should maintain consistent key order in JSON', () => {
      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Test',
        memory: { enabled: true },
        fullAutoErrorMode: FullAutoErrorMode.ASK_USER,
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      const lines = savedContent.split('\n').filter(line => line.trim());
      
      // Verify the order of keys (model should be first)
      const modelLineIndex = lines.findIndex(line => line.includes('"model"'));
      const memoryLineIndex = lines.findIndex(line => line.includes('"memory"'));
      const errorModeLineIndex = lines.findIndex(line => line.includes('"fullAutoErrorMode"'));
      
      expect(modelLineIndex).toBeLessThan(memoryLineIndex);
      expect(modelLineIndex).toBeLessThan(errorModeLineIndex);
    });

    it('should not include trailing comma in JSON', () => {
      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Test',
        memory: { enabled: true },
        fullAutoErrorMode: FullAutoErrorMode.ASK_USER,
      };

      saveConfig(config, configPath, instructionsPath);

      const savedContent = readFileSync(configPath, 'utf-8');
      
      // JSON should not have trailing commas
      expect(savedContent).not.toMatch(/,\s*\}/);
      expect(savedContent).not.toMatch(/,\s*\]/);
    });
  });

  describe('concurrent modifications', () => {
    it('should handle multiple rapid saves', () => {
      const configs: AppConfig[] = [
        { model: 'model-1', instructions: 'Test 1', memory: { enabled: true } },
        { model: 'model-2', instructions: 'Test 2', fullAutoErrorMode: FullAutoErrorMode.ASK_USER },
        { model: 'model-3', instructions: 'Test 3', memory: { enabled: false }, fullAutoErrorMode: FullAutoErrorMode.IGNORE_AND_CONTINUE },
      ];

      for (const config of configs) {
        saveConfig(config, configPath, instructionsPath);
      }

      // Final saved config should be the last one
      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.model).toBe('model-3');
      expect(parsed.memory).toEqual({ enabled: false });
      expect(parsed.fullAutoErrorMode).toBe(FullAutoErrorMode.IGNORE_AND_CONTINUE);
    });
  });

  describe('backward compatibility', () => {
    it('should not break existing configs without memory or fullAutoErrorMode', () => {
      // Simulate an old config file
      const oldConfigContent = JSON.stringify({ model: 'old-model' }, null, 2);
      const fs = require('fs');
      fs.writeFileSync(configPath, oldConfigContent, 'utf-8');
      fs.writeFileSync(instructionsPath, 'Old instructions', 'utf-8');

      // Load it
      const loadedConfig = loadConfig(configPath, instructionsPath, { 
        disableProjectDoc: true 
      });

      expect(loadedConfig.model).toBe('old-model');
      expect(loadedConfig.memory).toBeUndefined();
      expect(loadedConfig.fullAutoErrorMode).toBeUndefined();

      // Save it back
      saveConfig(loadedConfig, configPath, instructionsPath);

      // Verify it didn't add unwanted fields
      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.model).toBe('old-model');
      expect(parsed.memory).toBeUndefined();
      expect(parsed.fullAutoErrorMode).toBeUndefined();
      expect(Object.keys(parsed)).toEqual(['model']);
    });

    it('should preserve existing memory config when updating model', () => {
      // Start with config that has memory
      const config1: AppConfig = {
        model: 'model-1',
        instructions: 'Test',
        memory: { enabled: true },
      };

      saveConfig(config1, configPath, instructionsPath);

      // Load and modify model only
      const loadedConfig = loadConfig(configPath, instructionsPath, { 
        disableProjectDoc: true 
      });
      loadedConfig.model = 'model-2';

      saveConfig(loadedConfig, configPath, instructionsPath);

      // Memory should still be present
      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.model).toBe('model-2');
      expect(parsed.memory).toEqual({ enabled: true });
    });

    it('should preserve existing fullAutoErrorMode when updating model', () => {
      // Start with config that has fullAutoErrorMode
      const config1: AppConfig = {
        model: 'model-1',
        instructions: 'Test',
        fullAutoErrorMode: FullAutoErrorMode.IGNORE_AND_CONTINUE,
      };

      saveConfig(config1, configPath, instructionsPath);

      // Load and modify model only
      const loadedConfig = loadConfig(configPath, instructionsPath, { 
        disableProjectDoc: true 
      });
      loadedConfig.model = 'model-2';

      saveConfig(loadedConfig, configPath, instructionsPath);

      // fullAutoErrorMode should still be present
      const savedContent = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(savedContent) as StoredConfig;

      expect(parsed.model).toBe('model-2');
      expect(parsed.fullAutoErrorMode).toBe(FullAutoErrorMode.IGNORE_AND_CONTINUE);
    });
  });

  describe('file system error handling', () => {
    it('should handle permission errors gracefully when saving', () => {
      // This test would need special setup for permission testing
      // For now, we just verify the function doesn't crash with normal permissions
      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Test',
        memory: { enabled: true },
      };

      expect(() => saveConfig(config, configPath, instructionsPath)).not.toThrow();
    });

    it('should create nested directories recursively', () => {
      const deepPath = join(testDir, 'a', 'b', 'c', 'd', 'config.json');
      const deepInstr = join(testDir, 'a', 'b', 'c', 'd', 'instructions.md');

      const config: AppConfig = {
        model: 'test-model',
        instructions: 'Test',
        memory: { enabled: true },
      };

      saveConfig(config, deepPath, deepInstr);

      expect(existsSync(deepPath)).toBe(true);
      expect(existsSync(deepInstr)).toBe(true);
    });
  });
});