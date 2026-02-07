---
name: gen-test
description: Generate Vitest tests for a file following project conventions. Use when asked to create tests for a source file.
disable-model-invocation: true
---

Generate tests for: $ARGUMENTS

## Test Stack

- **Runner**: Vitest (`vitest run`)
- **React**: `@testing-library/react` with `@testing-library/user-event`
- **Assertions**: `@testing-library/jest-dom` for DOM matchers, Vitest `expect` for everything else
- **Mocking**: `vi.mock()` for modules, `vi.fn()` for functions

## Conventions

1. Read the existing test at `app/api/queue/items/route.test.ts` for the project's testing patterns
2. Read the source file specified in `$ARGUMENTS`
3. Place the test file adjacent to the source: `<filename>.test.ts` or `<filename>.test.tsx`
4. Use `describe` blocks grouped by function/component, with `it` for individual cases
5. Mock Supabase client when testing code that uses `@supabase/supabase-js` or `@supabase/ssr`
6. Mock `process.env` in `beforeEach`, restore in `afterEach`
7. For React components: test user interactions, rendered output, and edge cases
8. For API routes: test request validation, success paths, and error handling
9. For utility functions: test happy paths, edge cases, and error conditions

## After Generation

Run the tests to verify they pass:

```bash
npx vitest run --reporter=verbose <test-file-path>
```

Fix any failures before finishing.
