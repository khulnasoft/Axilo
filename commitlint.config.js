module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "scope-enum": [
      2,
      "always",
      ["cli", "core", "docs", "ci", "deps", "test", "config"],
    ],
    "subject-case": [
      2,
      "always",
      ["sentence-case", "start-case", "pascal-case", "lower-case"],
    ],
  },
};
