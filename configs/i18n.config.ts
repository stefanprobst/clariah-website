/**
 * Configuration for the locales supported by this app.
 *
 * This must stay free of runtime dependencies - type-only imports are fine, because they are erased - since it is
 * imported by `next.config.ts` as well, where it is used to strip translations for unsupported locales from
 * `react-aria-components` out of the client bundle.
 *
 * Prefer importing from `lib/i18n/locales.ts` in app code, which also provides derived types and helpers.
 */

import type { Timezone } from "next-intl";

export const locales = ["de-AT", "en-GB"] as const;

export const defaultLocale: (typeof locales)[number] = "de-AT";

export const timeZone: Timezone = "UTC";
