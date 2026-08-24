"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "react-aria-components/I18nProvider";

import type { IntlLocale } from "#/lib/i18n/locales.ts";

interface ClientProvidersProps {
	children: ReactNode;
	locale: IntlLocale;
}

export function ClientProviders(props: Readonly<ClientProvidersProps>): ReactNode {
	const { children, locale } = props;

	return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
