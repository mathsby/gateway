import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Both spec files target the same consumer/provider pair and write into the
    // same pact file; Pact's native core merges interactions across files only
    // when they run in one process, so parallel workers would clobber each other.
    fileParallelism: false,
  },
});
