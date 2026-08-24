import { type NextRequest, NextResponse } from "next/server";

// TODO:
export function POST(_request: NextRequest): NextResponse {
	return NextResponse.json({ ok: true });
}
