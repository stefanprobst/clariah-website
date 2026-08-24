import { defineConfig } from "@eloqnt/cli";

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
	messages: {
		format: "po",
		locales: "infer",
		path: "./messages",
		sourceLocale: "de",
	},
	srcPath: ["./app", "./components", "./lib"],
});
