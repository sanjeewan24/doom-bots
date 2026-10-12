# Contributing

Issues and pull requests are welcome.

- Node 18+, no runtime dependencies. Keep it that way.
- Run `node test/guard.test.js` before opening a PR. It must pass.
- UI changes: run `doom` with `DOOM_CLAUDE_BIN=test/fake-claude` to see the views without spending tokens, and use the Demo buttons.
- Agent files live in `agents/`. They use `{{DOOM_HOME}}` as a path placeholder that `doom install` fills in. Do not hardcode machine paths.
- All agents run on Sonnet 4.6 at medium effort with the caveman and ponytail skills. Do not add other models.
