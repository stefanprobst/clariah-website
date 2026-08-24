import { defineConfig } from "oxlint";

const config = defineConfig({
	overrides: [
		{
			files: ["**/*.test.ts"],
			/** A `!` pattern inside `files` would widen the override to every file, not narrow it. */
			excludeFiles: ["e2e/**/*.test.ts"],
			/**
			 * `plugins` belongs in the override, not at top level, so the plugin is only ever loaded for the files whose
			 * rules it serves. It no longer decides which rules run: `oxlint.config.ts` turns every category off, so each
			 * rule below is opted into explicitly.
			 */
			plugins: ["vitest"],
			/** `env` is not inherited through `extends`, but it is a valid - and here correctly scoped - override key. */
			env: {
				builtin: true,
				browser: true,
			},
			rules: {
				/**
				 * ============================================================================================================
				 * Correctness.
				 * ============================================================================================================
				 */

				"vitest/consistent-each-for": "error",
				"vitest/expect-expect": "off",
				"vitest/hoisted-apis-on-top": "error",
				"vitest/no-conditional-expect": "off",
				"vitest/no-conditional-tests": "error",
				"vitest/no-disabled-tests": "off",
				"vitest/no-focused-tests": "off",
				"vitest/no-standalone-expect": "off",
				"vitest/prefer-snapshot-hint": "off",
				"vitest/require-awaited-expect-poll": "off",
				"vitest/require-local-test-context-for-concurrent-snapshots": "error",
				"vitest/require-mock-type-parameters": "off",
				"vitest/require-to-throw-message": "off",
				"vitest/valid-describe-callback": "off",
				"vitest/valid-expect": "off",
				"vitest/valid-expect-in-promise": "off",
				"vitest/valid-title": "off",
				"vitest/warn-todo": "error",

				/**
				 * ============================================================================================================
				 * Suspicious.
				 * ============================================================================================================
				 */
				"vitest/no-commented-out-tests": "off",

				/**
				 * ============================================================================================================
				 * Pedantic.
				 * ============================================================================================================
				 */
				"vitest/no-conditional-in-test": "off",

				/**
				 * ============================================================================================================
				 * Restriction.
				 * ============================================================================================================
				 */
				"vitest/require-test-timeout": "off",

				/**
				 * ============================================================================================================
				 * Style.
				 * ============================================================================================================
				 */

				"vitest/consistent-test-filename": "off",
				"vitest/consistent-test-it": "off",
				"vitest/consistent-vitest-vi": "error",
				"vitest/max-expects": "off",
				"vitest/max-nested-describe": "off",
				"vitest/no-alias-methods": "off",
				"vitest/no-duplicate-hooks": "off",
				"vitest/no-hooks": "off",
				"vitest/no-identical-title": "off",
				"vitest/no-import-node-test": "error",
				"vitest/no-importing-vitest-globals": "off",
				"vitest/no-interpolation-in-snapshots": "off",
				"vitest/no-large-snapshots": "off",
				"vitest/no-mocks-import": "off",
				"vitest/no-restricted-matchers": "off",
				"vitest/no-restricted-vi-methods": "off",
				"vitest/no-test-prefixes": "off",
				"vitest/no-test-return-statement": "off",
				"vitest/no-unneeded-async-expect-function": "off",
				"vitest/padding-around-after-all-blocks": "error",
				"vitest/padding-around-test-blocks": "error",
				"vitest/prefer-called-exactly-once-with": "off",
				"vitest/prefer-called-once": "error",
				"vitest/prefer-called-times": "error",
				"vitest/prefer-called-with": "off",
				"vitest/prefer-comparison-matcher": "off",
				"vitest/prefer-describe-function-title": "off",
				"vitest/prefer-each": "off",
				"vitest/prefer-equality-matcher": "off",
				"vitest/prefer-expect-assertions": "off",
				"vitest/prefer-expect-resolves": "off",
				"vitest/prefer-expect-type-of": "error",
				"vitest/prefer-hooks-in-order": "off",
				"vitest/prefer-hooks-on-top": "off",
				"vitest/prefer-import-in-mock": "error",
				"vitest/prefer-importing-vitest-globals": "off",
				"vitest/prefer-lowercase-title": "off",
				"vitest/prefer-mock-promise-shorthand": "off",
				"vitest/prefer-mock-return-shorthand": "off",
				"vitest/prefer-spy-on": "off",
				"vitest/prefer-strict-boolean-matchers": "off",
				"vitest/prefer-strict-equal": "off",
				"vitest/prefer-to-be": "off",
				"vitest/prefer-to-be-falsy": "error",
				"vitest/prefer-to-be-object": "error",
				"vitest/prefer-to-be-truthy": "error",
				"vitest/prefer-to-contain": "off",
				"vitest/prefer-to-have-been-called-times": "off",
				"vitest/prefer-to-have-length": "off",
				"vitest/prefer-todo": "off",
				"vitest/require-hook": "off",
				"vitest/require-top-level-describe": "off",
			},
		},
	],
});

export default config;
