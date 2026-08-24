import createI18nMiddleware from "next-intl/middleware";

import { routing } from "#/lib/i18n/routing.ts";

/**
 * TODO:
 *
 * 'next-intl` v4 adds an `x-default` alternate link for all routes, which we don't want, since we only redirect on "/".
 *
 * @see {@link https://next-intl.dev/docs/routing/configuration#alternate-links}
 */

export const middleware = createI18nMiddleware(routing);
