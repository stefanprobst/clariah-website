import * as fs from "node:fs/promises";
import * as path from "node:path";

import { createUrl, log } from "@acdh-oeaw/lib";

import { env } from "#/configs/env.config.ts";

/**
 * `openapi-typescript` prints its output with the TypeScript compiler's AST API, which is not (yet) exposed by
 * TypeScript v7. We therefore run the generator via `pnpx`, in an environment which is pinned to TypeScript v6, and
 * isolated from the TypeScript version used by the app.
 *
 * Once TypeScript v7 ships the factory and printer APIs, we can go back to importing `openapi-typescript` directly.
 */
const versions = {
	"openapi-typescript": "7.13.0",
	typescript: "6.0.3",
};

const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
const pathname = env.NEXT_PUBLIC_API_OPENAPI_PATHNAME;

const outputFilePath = "./lib/openapi/types.ts";

async function generate(): Promise<void> {
	const url = createUrl({ baseUrl, pathname });

	await fs.mkdir(path.dirname(outputFilePath), { recursive: true });

	const { exitCode, signalCode, success } = Bun.spawnSync(
		[
			"pnpx",
			...Object.entries(versions).map(([name, version]) => `--package=${name}@${version}`),
			"openapi-typescript",
			String(url),
			"--output",
			outputFilePath,
		],
		{ stdout: "inherit", stderr: "inherit" },
	);

	if (!success) {
		/** `exitCode` is `null` when the process was killed by a signal. */
		const reason = signalCode != null ? `signal ${signalCode}` : `status code ${String(exitCode)}`;

		throw new Error(`Generator exited with ${reason}.`);
	}
}

generate()
	// oxlint-disable-next-line promise/always-return
	.then(() => {
		log.success("Successfully generated API types from OpenAPI schema.");
	})
	.catch((error: unknown) => {
		log.error("Failed to generate API types from OpenAPI schema.\n", error);
	});
