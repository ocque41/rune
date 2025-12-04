import { start } from "workflow/api";
import { NextResponse } from "next/server";

import { handleSideProjectSignup } from "@/workflows/side-project-roulette";

export async function POST(request: Request) {
    const { email } = await request.json();

    if (typeof email !== "string") {
        return NextResponse.json(
            { message: "Invalid or missing 'email' field" },
            { status: 400 }
        );
    }

    // Executes asynchronously and does not block your app
    await start(handleSideProjectSignup, [email]);

    return NextResponse.json({
        message: "Side Project Roulette workflow started",
    });
}
