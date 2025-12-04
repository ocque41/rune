"use client";

import { useState } from "react";

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
        <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                    Side Project Roulette
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                    Enter your email to spin the wheel and get a new side project idea!
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                    >
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="you@example.com"
                    />
                </div>

                <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                    >
                        {message}
                    </div>
                )}
            </form>
        </div>
    );
}
