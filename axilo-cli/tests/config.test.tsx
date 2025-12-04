import type * as fsType from "fs";

import { loadConfig, saveConfig } from "../src/utils/config.js"; // parent import first
import { tmpdir } from "os";
import { join } from "path";
import { test, expect, beforeEach, afterEach, vi } from "vitest";

// In‑memory FS store
let memfs: Record<string, string> = {};

// Mock out the parts of "fs" that our config module uses:
vi.mock("fs", async () => {
  // now `real` is the actual fs module
  const real = (await vi.importActual("fs")) as typeof fsType;
  return {
    ...real,
    existsSync: (path: string) => memfs[path] !== undefined,
    readFileSync: (path: string) => {
      if (memfs[path] === undefined) {
        throw new Error("ENOENT");
      }
      return memfs[path];
    },
    writeFileSync: (path: string, data: string) => {
      memfs[path] = data;
    },
    mkdirSync: () => {
      // no‑op in in‑memory store
    },
    rmSync: (path: string) => {
      // recursively delete any key under this prefix
      const prefix = path.endsWith("/") ? path : path + "/";
      for (const key of Object.keys(memfs)) {
        if (key === path || key.startsWith(prefix)) {
          delete memfs[key];
        }
      }
    },
  };
});

let testDir: string;
let testConfigPath: string;
let testInstructionsPath: string;

beforeEach(() => {
  memfs = {}; // reset in‑memory store
  testDir = tmpdir(); // use the OS temp dir as our "cwd"
  testConfigPath = join(testDir, "config.json");
  testInstructionsPath = join(testDir, "instructions.md");
});

afterEach(() => {
  memfs = {};
});

test("loads default config if files don't exist", () => {
  const config = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  expect(config).toEqual({
    model: "o4-mini",
    instructions: "",
  });
});

test("saves and loads config correctly", () => {
  const testConfig = {
    model: "test-model",
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  // Our in‑memory fs should now contain those keys:
  expect(memfs[testConfigPath]).toContain(`"model": "test-model"`);
  expect(memfs[testInstructionsPath]).toBe("test instructions");

  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  expect(loadedConfig).toEqual(testConfig);
});

test("loads user instructions + project doc when axilo.md is present", () => {
  // 1) seed memfs: a config JSON, an instructions.md, and a axilo.md in the cwd
  const userInstr = "here are user instructions";
  const projectDoc = "# Project Title\n\nSome project‑specific doc";
  // first, make config so loadConfig will see storedConfig
  memfs[testConfigPath] = JSON.stringify({ model: "mymodel" }, null, 2);
  // then user instructions:
  memfs[testInstructionsPath] = userInstr;
  // and now our fake axilo.md in the cwd:
  const axiloPath = join(testDir, "axilo.md");
  memfs[axiloPath] = projectDoc;

  // 2) loadConfig without disabling project‑doc, but with cwd=testDir
  const cfg = loadConfig(testConfigPath, testInstructionsPath, {
    cwd: testDir,
  });

  // 3) assert we got both pieces concatenated
  expect(cfg.model).toBe("mymodel");
  expect(cfg.instructions).toBe(
    userInstr + "\n\n--- project-doc ---\n\n" + projectDoc,
  );
});


test("saves config with only model when memory and fullAutoErrorMode are undefined", () => {
  const testConfig = {
    model: "gpt-4",
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  expect(memfs[testConfigPath]).toContain('"model": "gpt-4"');
  expect(memfs[testConfigPath]).not.toContain('"memory"');
  expect(memfs[testConfigPath]).not.toContain('"fullAutoErrorMode"');
  expect(memfs[testInstructionsPath]).toBe("test instructions");
});

test("saves config with memory when memory is truthy", () => {
  const testConfig = {
    model: "gpt-4",
    memory: { enabled: true },
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  expect(memfs[testConfigPath]).toContain('"model": "gpt-4"');
  expect(memfs[testConfigPath]).toContain('"memory"');
  expect(memfs[testConfigPath]).toContain('"enabled": true');
});

test("saves config with fullAutoErrorMode when fullAutoErrorMode is truthy", () => {
  const testConfig = {
    model: "gpt-4",
    fullAutoErrorMode: "always",
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  expect(memfs[testConfigPath]).toContain('"model": "gpt-4"');
  expect(memfs[testConfigPath]).toContain('"fullAutoErrorMode"');
  expect(memfs[testConfigPath]).toContain('"always"');
});

test("saves config with both memory and fullAutoErrorMode when both are truthy", () => {
  const testConfig = {
    model: "gpt-4",
    memory: { enabled: true },
    fullAutoErrorMode: "always",
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  expect(memfs[testConfigPath]).toContain('"model": "gpt-4"');
  expect(memfs[testConfigPath]).toContain('"memory"');
  expect(memfs[testConfigPath]).toContain('"enabled": true');
  expect(memfs[testConfigPath]).toContain('"fullAutoErrorMode"');
  expect(memfs[testConfigPath]).toContain('"always"');
});

test("does not save memory when memory is falsy", () => {
  const testConfig = {
    model: "gpt-4",
    memory: undefined,
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  expect(memfs[testConfigPath]).toContain('"model": "gpt-4"');
  expect(memfs[testConfigPath]).not.toContain('"memory"');
});

test("does not save fullAutoErrorMode when fullAutoErrorMode is falsy", () => {
  const testConfig = {
    model: "gpt-4",
    fullAutoErrorMode: undefined,
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  expect(memfs[testConfigPath]).toContain('"model": "gpt-4"');
  expect(memfs[testConfigPath]).not.toContain('"fullAutoErrorMode"');
});

test("saves and loads config with memory correctly", () => {
  const testConfig = {
    model: "test-model",
    memory: { enabled: true },
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  expect(loadedConfig.model).toBe("test-model");
  expect(loadedConfig.memory).toEqual({ enabled: true });
  expect(loadedConfig.instructions).toBe("test instructions");
});

test("saves and loads config with fullAutoErrorMode correctly", () => {
  const testConfig = {
    model: "test-model",
    fullAutoErrorMode: "always",
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  expect(loadedConfig.model).toBe("test-model");
  expect(loadedConfig.fullAutoErrorMode).toBe("always");
  expect(loadedConfig.instructions).toBe("test instructions");
});

test("saves and loads config with all optional fields correctly", () => {
  const testConfig = {
    model: "test-model",
    memory: { enabled: true },
    fullAutoErrorMode: "prompt",
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  expect(loadedConfig.model).toBe("test-model");
  expect(loadedConfig.memory).toEqual({ enabled: true });
  expect(loadedConfig.fullAutoErrorMode).toBe("prompt");
  expect(loadedConfig.instructions).toBe("test instructions");
});

test("saves config to YAML format with optional fields", () => {
  const yamlConfigPath = join(testDir, "config.yml");
  const testConfig = {
    model: "gpt-4",
    memory: { enabled: true },
    fullAutoErrorMode: "always",
    instructions: "test instructions",
  };
  saveConfig(testConfig, yamlConfigPath, testInstructionsPath);

  expect(memfs[yamlConfigPath]).toContain("model: gpt-4");
  expect(memfs[yamlConfigPath]).toContain("memory:");
  expect(memfs[yamlConfigPath]).toContain("enabled: true");
  expect(memfs[yamlConfigPath]).toContain("fullAutoErrorMode: always");
});

test("saves config to YAML format without optional fields when undefined", () => {
  const yamlConfigPath = join(testDir, "config.yml");
  const testConfig = {
    model: "gpt-4",
    instructions: "test instructions",
  };
  saveConfig(testConfig, yamlConfigPath, testInstructionsPath);

  expect(memfs[yamlConfigPath]).toContain("model: gpt-4");
  expect(memfs[yamlConfigPath]).not.toContain("memory:");
  expect(memfs[yamlConfigPath]).not.toContain("fullAutoErrorMode:");
});

test("handles edge case with memory enabled false", () => {
  const testConfig = {
    model: "gpt-4",
    memory: { enabled: false },
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  expect(memfs[testConfigPath]).toContain('"model": "gpt-4"');
  expect(memfs[testConfigPath]).toContain('"memory"');
  expect(memfs[testConfigPath]).toContain('"enabled": false');
  
  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  expect(loadedConfig.memory).toEqual({ enabled: false });
});

test("preserves backward compatibility when loading old config without optional fields", () => {
  memfs[testConfigPath] = JSON.stringify({ model: "old-model" }, null, 2);
  memfs[testInstructionsPath] = "old instructions";

  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  
  expect(loadedConfig.model).toBe("old-model");
  expect(loadedConfig.memory).toBeUndefined();
  expect(loadedConfig.fullAutoErrorMode).toBeUndefined();
  expect(loadedConfig.instructions).toBe("old instructions");
});

test("handles config with only fullAutoErrorMode", () => {
  const testConfig = {
    model: "gpt-4",
    fullAutoErrorMode: "never",
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  expect(memfs[testConfigPath]).toContain('"model": "gpt-4"');
  expect(memfs[testConfigPath]).toContain('"fullAutoErrorMode": "never"');
  expect(memfs[testConfigPath]).not.toContain('"memory"');
  
  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  expect(loadedConfig.model).toBe("gpt-4");
  expect(loadedConfig.fullAutoErrorMode).toBe("never");
  expect(loadedConfig.memory).toBeUndefined();
});

test("handles config with only memory", () => {
  const testConfig = {
    model: "gpt-4",
    memory: { enabled: true },
    instructions: "test instructions",
  };
  saveConfig(testConfig, testConfigPath, testInstructionsPath);

  expect(memfs[testConfigPath]).toContain('"model": "gpt-4"');
  expect(memfs[testConfigPath]).toContain('"memory"');
  expect(memfs[testConfigPath]).not.toContain('"fullAutoErrorMode"');
  
  const loadedConfig = loadConfig(testConfigPath, testInstructionsPath, {
    disableProjectDoc: true,
  });
  expect(loadedConfig.model).toBe("gpt-4");
  expect(loadedConfig.memory).toEqual({ enabled: true });
  expect(loadedConfig.fullAutoErrorMode).toBeUndefined();
});
