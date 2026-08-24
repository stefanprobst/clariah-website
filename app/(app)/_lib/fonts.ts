import { DM_Sans, Fira_Code } from "next/font/google";

export const body = DM_Sans({
	subsets: ["latin"],
	style: ["normal", "italic"],
	variable: "--_font-body",
});

export const heading = DM_Sans({
	subsets: ["latin"],
	style: ["normal", "italic"],
	variable: "--_font-heading",
});

export const code = Fira_Code({
	preload: false,
	variable: "--_font-code",
});
