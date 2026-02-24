"use client";

import React, { useState } from "react";

export function SideProjectForm() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setMessage("");

        try {
            const res = await fetch("/api/side-project-signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                throw new Error("Failed to start workflow");
            }

            setStatus("success");
            setMessage("Workflow started! Check your logs for the result.");
            setEmail("");
        } catch (error) {
            console.error(error);
            setStatus("error");
            setMessage("Something went wrong. Please try again.");
        }
    };

    return (
        <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[color:var(--metric-surface-2)] p-8 shadow-xl">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                    Side Project Roulette
                </h2>
                <p className="text-white/65">
                    Enter your email to spin the wheel and get a new side project idea!
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium text-white/75"
                    >
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg border border-white/12 bg-[color:var(--metric-surface-1)] px-4 py-3 text-white focus:border-white/30 focus:ring-2 focus:ring-white/20 outline-none transition-all"
                        placeholder="you@example.com"
                        title="Enter email to receive side-project workflow results"
                    />
                </div>

                <button
                    type="submit"
                    disabled={status === "loading"}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/92 px-6 py-3 text-lg font-semibold text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    title="Start side-project workflow run"
                >
                    {status === "loading" ? (
                        <>
                            <span className="animate-spin text-xl">⟳</span>
                            Spinning...
                        </>
                    ) : (
                        "Spin the Wheel 🎲"
                    )}
                </button>

                {message && (
                    <div
                        className={`p-4 rounded-lg text-center ${status === "success"
                            ? "bg-white/10 text-white/85"
                            : "bg-white/8 text-white/70"
                            }`}
                    >
                        {message}
                    </div>
                )}
            </form>
        </div>
    );
}
