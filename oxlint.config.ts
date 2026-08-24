import * as path from "node:path";

import { defineConfig } from "oxlint";

import base from "#/configs/oxlint/base.ts";
import nextjs, { restrictedImports as nextjsRestrictedImports } from "#/configs/oxlint/nextjs.ts";
import playwright from "#/configs/oxlint/playwright.ts";
import react, { settings as reactSettings } from "#/configs/oxlint/react.ts";
import regexp from "#/configs/oxlint/regexp.ts";
import tailwindcss, { settings as betterTailwindcssSettings } from "#/configs/oxlint/tailwindcss.ts";
import vitest from "#/configs/oxlint/vitest.ts";

const restrictedImports = {
	paths: [...nextjsRestrictedImports.paths],
	patterns: [{ group: ["./**", "../**"] }],
};

const config = defineConfig({
	categories: {
		correctness: "off",
		nursery: "off",
		pedantic: "off",
		perf: "off",
		restriction: "off",
		style: "off",
		suspicious: "off",
	},
	extends: [base, nextjs, playwright, react, regexp, tailwindcss, vitest],
	env: {
		builtin: true,
		browser: true,
	},
	/** @see {@link https://github.com/ota-meshi/eslint-plugin-regexp/issues/1033} */
	ignorePatterns: ["**/*.d.ts"],
	options: {
		reportUnusedDisableDirectives: "error",
		typeAware: true,
		typeCheck: true,
	},
	rules: {
		"no-restricted-imports": [
			"error",
			{
				...restrictedImports,
				paths: [
					{
						message: "Please use `#/lib/i18n/locales.ts` instead, which also provides derived types and helpers.",
						name: "#/configs/i18n.config.ts",
					},
					...restrictedImports.paths,
				],
			},
		],
	},
	settings: {
		"better-tailwindcss": {
			...betterTailwindcssSettings,
			cwd: import.meta.dirname,
			entryPoint: path.join(import.meta.dirname, "./styles/index.css"),
		},
		react: reactSettings,
	},
	overrides: [
		{
			files: ["configs/**/*.ts"],
			rules: {
				"import/no-default-export": "off",
			},
		},
		{
			files: ["next.config.ts", "lib/i18n/locales.ts"],
			rules: {
				"no-restricted-imports": ["error", restrictedImports],
			},
		},
	],
});

export default config;
