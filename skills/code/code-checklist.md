# Code review checklist

Written by Claude on 2026-10-12 from general engineering practice and the failure patterns of AI-written code. It is a checklist for finding problems. It is not proof a problem exists. Each hit needs evidence (file:line and snippet, or command output) before it is reported.

Out of lane (hand off, do not rate): vulnerabilities belong to the security reviewer, journeys and accessibility to the UX reviewer, visual fidelity to the UI design reviewer. Your lane is: does the code do what the plan says, correctly, and can it be maintained.

## 1. Plan conformance
- For every task in `specs/IMPLEMENTATION_PLAN.md` that the branch claims to cover, mark it done, partial or missing. Check its acceptance check against the code and the test results.
- Changed files that tie to no task are scope creep. List them.
- API endpoints, request and response shapes, tables and columns match `specs/BACKEND_STRUCTURE.md`.
- Dependencies and versions match `specs/TECH_STACK.md`. No new dependency without a task that needs it.
- The builder's report to Marcus matches what the code and test output show. A claim with no matching evidence is a finding.

## 2. Correctness
- Boundary conditions: empty, zero, one, many, maximum, negative, null or undefined.
- Off-by-one errors, inverted conditions, wrong operators (`=` and `==`, `&&` and `||`), loops that never end or skip items.
- Early returns that skip cleanup. Fallthrough in switches.
- Money or exact quantities held as floating point. Rounding with no stated rule.
- Dates and times: time zones, daylight saving, locale, parsing assumptions.
- String and number comparisons, truthiness traps, integer overflow.
- Shared mutable defaults (mutable default arguments, shared module-level state).
- Async: missing `await`, unhandled rejections, results used before ready, fire-and-forget that needs a result.

## 3. Error handling
- Errors reach the caller or the log. Nothing is swallowed with an empty `catch` or a bare `except`.
- Resources are released on every path (`finally`, `with`, `using`, `defer`).
- Retries are bounded and have backoff. External calls have timeouts.
- Multi-step writes use a transaction or can be undone. Partial failure leaves a consistent state.
- Messages to users are clear. Messages to logs have the detail.

## 4. Data and contracts
- Request and response shapes, status codes and field names match the spec on both sides of every call.
- Schema and migrations match the code that reads and writes them.
- Validation at boundaries for correctness (types, ranges, required fields). Security-driven validation belongs to the security reviewer.
- Queries that return lists have deterministic order and pagination where the spec needs it.
- Null and missing values are handled where the database or API can return them.

## 5. State and concurrency
- Shared mutable state, caches and singletons: who writes, who reads, what invalidates.
- Check-then-act races, double submits, duplicate processing, missing idempotency where a retry can happen.
- Event and message ordering assumptions.

## 6. Resources and performance
- N+1 queries. Queries on unindexed filter columns where the spec expects scale.
- Unbounded loops, recursion, queues or in-memory growth. Whole files read into memory.
- Blocking I/O in a hot path. Heavy work repeated inside loops.
- Leaks: event listeners, timers, connections, file handles, subscriptions never removed.

## 7. Tests
- Every acceptance criterion in the plan has at least one test.
- Tests assert behavior and outputs, not that a mock was called. Security and business rules are not mocked away.
- Edge and failure cases are covered, not only the happy path.
- No `skip`, `only`, `xfail` or commented-out tests left in.
- Tests are deterministic: no real clock, network, random values or sleeps without control. No shared state between tests.
- Tests do not touch real data, real services or production paths.

## 8. AI-written code patterns
- Imports, functions, methods or options that do not exist in the pinned version. Check against the installed package or the repo.
- Fake implementations: hardcoded return values, `pass`, `return []`, `NotImplementedError`, `TODO` bodies, presented as done.
- Mocks or sample data inside production code paths.
- Copy-pasted blocks with stale names, comments or constants.
- Over-engineering: unused abstractions, speculative config, layers the plan did not ask for.
- A new helper that duplicates one that already exists in the repo.
- Naming or style that ignores the repo's conventions.
- Dead code, commented-out code, leftover debug output (`console.log`, `print`, `debugger`).
- Comments or docstrings that contradict what the code does.
- Syntax or APIs from a newer or older language version than `TECH_STACK.md` says.

## 9. Maintainability
- Function and file size, nesting depth and parameter counts that make code hard to follow. Report only when it blocks understanding.
- Module boundaries follow the structure in `BACKEND_STRUCTURE.md`. No circular dependencies.
- Configuration is not hardcoded. Magic numbers are named.
- New setup steps, environment variables or migrations are documented.

## 10. Build hygiene
- Lint, type check and build pass with no new warnings.
- The lockfile is updated and consistent with the manifest.
- No unrelated formatting churn in the diff. No build artifacts committed.
- Commit messages carry the task id.

## 11. Running the project's own checks
Find the commands in `specs/TECH_STACK.md`, `specs/IMPLEMENTATION_PLAN.md`, `package.json` scripts, a Makefile or CI config. Do not invent commands.

Safety pre-check, before running anything:
1. Read the test setup and config. Look for database paths, connection strings, non-local URLs, API keys, environment variable names and the word "production".
2. If tests could touch real data, a shared service or the network beyond localhost, do not run them. Report it as a finding and put the run on the manual list.
3. Never load a real `.env` or copy secrets into the worktree.

Run order, in a temporary git worktree outside the builder's working tree:
1. Install from the lockfile only, with install scripts off where the ecosystem allows it (`npm ci --ignore-scripts`). If tests need scripts or there is no lockfile, stop and report. Do not enable scripts yourself.
2. Lint, then type check, then build, then tests.
3. Use a timeout on every command. Record the command, the exit code and the last lines of output.
4. If a test fails, run that test once more to spot flakiness. Report both results.
5. Remove the worktree you created when finished.

## Not checkable from code and a test run (hand to the human)
- Behavior under real load, real data or real services.
- Tests that need a live environment, device or GUI.
- Whether the product is right, as opposed to whether the code matches the plan.
