import { NextIntlClientProvider, useLocale } from "next-intl";
import type { ReactNode } from "react";
import { LocalizedStringProvider } from "react-aria-components/i18n";

import { ClientProviders } from "#/app/(app)/[locale]/_components/client-providers.tsx";

interface ProvidersProps {
	children: ReactNode;
}

export function Providers(props: Readonly<ProvidersProps>): ReactNode {
	const { children } = props;

	const locale = useLocale();

	return (
		<NextIntlClientProvider>
			<LocalizedStringProvider locale={locale} />
			<ClientProviders locale={locale}>{children}</ClientProviders>
		</NextIntlClientProvider>
	);
}
