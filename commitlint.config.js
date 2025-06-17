{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "test",
        "chore",
        "perf",
        "ci",
        "revert",
        "build"
      ]
    ],
    "scope-enum": [
      2,
      "always",
      [
        "backend",
        "frontend",
        "shared",
        "docker",
        "ci",
        "docs",
        "deps"
      ]
    ],
    "subject-case": [2, "always", "lower-case"],
    "header-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 100],
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [2, "always"]
  }
}
