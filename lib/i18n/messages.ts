import { type IntlLocale, getIntlLanguage } from "#/lib/i18n/locales.ts";

export async function getIntlMessages(locale: IntlLocale): Promise<IntlMessages> {
	const language = getIntlLanguage(locale);

	const { default: messages } = (await import(`../../messages/${language}.po`)) as { default: IntlMessages };

	return messages;
}

export type IntlMessages = Record<string, unknown>;
