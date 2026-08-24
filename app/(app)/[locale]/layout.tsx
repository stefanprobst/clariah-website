import "#/styles/index.css";

import { createUrl } from "@acdh-oeaw/lib";
import type { Metadata } from "next";
import { useLocale } from "next-intl";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { Providers } from "#/app/(app)/[locale]/_components/providers.tsx";
import { HtmlDocument } from "#/app/(app)/_components/html-document.tsx";
import { env } from "#/configs/env.config.ts";
import { routing } from "#/lib/i18n/routing.ts";

export { viewport } from "#/app/(app)/_lib/viewport.config.ts";

interface LocaleLayoutProps extends LayoutProps<"/[locale]"> {}

export function generateStaticParams(): Array<Awaited<LocaleLayoutProps["params"]>> {
	return routing.locales.map((locale) => {
		return { locale };
	});
}

export async function generateMetadata(): Promise<Promise<Metadata>> {
	const _locale = await getLocale();

	// TODO:
	const metadata: Metadata = {
		metadataBase: createUrl({ baseUrl: env.NEXT_PUBLIC_APP_BASE_URL }),
	};

	return metadata;
}

export default function LocaleLayout(props: Readonly<LocaleLayoutProps>): ReactNode {
	const { children } = props;

	const locale = useLocale();

	return (
		<HtmlDocument locale={locale}>
			<body>
				<Providers>{children}</Providers>
			</body>
		</HtmlDocument>
	);
}
