import { useExtracted as useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface IndexPageProps extends PageProps<"/[locale]"> {}

export default function IndexPage(_props: Readonly<IndexPageProps>): ReactNode {
	const t = useTranslations();

	return (
		<main>
			<h1>{t("Hallo, Welt!")}</h1>
		</main>
	);
}
