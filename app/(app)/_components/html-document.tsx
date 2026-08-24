import "#/styles/index.css";

import cn from "clsx/lite";
import type { ComponentProps, ReactNode } from "react";
import { isRTL } from "react-aria-components/I18nProvider";

import * as fonts from "#/app/(app)/_lib/fonts.ts";
import type { IntlLocale } from "#/lib/i18n/locales.ts";

interface HtmlDocumentProps extends ComponentProps<"html"> {
	children: ReactNode;
	locale: IntlLocale;
}

export function HtmlDocument(props: Readonly<HtmlDocumentProps>): ReactNode {
	const { children, locale } = props;

	return (
		<html
			className={cn(
				fonts.body.variable,
				fonts.heading.variable,
				fonts.code.variable,
				"bg-background-base font-body text-text-strong antialiased",
			)}
			dir={isRTL(locale) ? "rtl" : "ltr"}
			lang={locale}
		>
			{children}
		</html>
	);
}
