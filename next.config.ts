import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { env } from "#/configs/env.config.ts";

/** @see {@link https://github.com/adobe/react-spectrum/pull/10462} */
const reactAriaPackages = [
	"@react-stately",
	"@react-aria",
	"@react-spectrum",
	"@adobe/react-spectrum",
	"react-stately",
	"react-aria",
	"react-aria-components",
];

const reactAriaLocales = `**/{${reactAriaPackages.join(",")}}/**/??-??.{js,cjs,mjs,json}`;

const config: NextConfig = {
	cacheComponents: true,
	experimental: {
		cachedNavigations: true,
		globalNotFound: true,
		strictRouteTypes: true,
		turbopackRustReactCompiler: true,
	},
	images: {
		remotePatterns: [{ hostname: "imgproxy.acdh.oeaw.ac.at" }],
	},
	logging: {
		browserToTerminal: true,
		fetches: {
			hmrRefreshes: true,
			fullUrl: true,
		},
	},
	output: env.BUILD_MODE,
	outputFileTracingIncludes: {
		"**/*": ["./public/assets/fonts/**/*.ttf"],
	},
	partialPrefetching: true,
	reactCompiler: true,
	turbopack: {
		rules: {
			[reactAriaLocales]: {
				condition: { all: ["foreign", "browser"] },
				loaders: ["./configs/turbopack/empty-locale-module-loader.cjs"],
				as: "*.js",
			},
			"*.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
		},
	},
	typedRoutes: false,
	typescript: {
		ignoreBuildErrors: true,
	},
};

const plugins: Array<(config: NextConfig) => NextConfig> = [
	createNextIntlPlugin({
		experimental: {
			extract: true,
			messages: {
				format: "po",
				locales: "infer",
				path: "./messages",
				precompile: true,
				sourceLocale: "de",
			},
			srcPath: ["./app", "./components", "./lib"],
		},
		requestConfig: "./lib/i18n/request.ts",
	}),
];

export default plugins.reduce((config, plugin) => plugin(config), config);
