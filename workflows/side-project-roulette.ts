import { sleep, FatalError } from "workflow";

type User = {
    id: string;
    email: string;
    idea?: string;
};

export async function handleSideProjectSignup(email: string) {
    "use workflow";

    const user = await createUser(email);
    await sendWelcomeEmail(user);

    // simulate thinking time for the idea
    await sleep("5s");

    const userWithIdea = await assignSideProjectIdea(user);

    await sendIdeaEmail(userWithIdea);

    console.log(
        "[Side Project Roulette] Workflow complete for",
        userWithIdea.email,
        "idea:",
        userWithIdea.idea
    );

    return { userId: userWithIdea.id, status: "idea_assigned", idea: userWithIdea.idea };
}

// Step 1: create a "user"
async function createUser(email: string): Promise<User> {
    "use step";

    console.log(`[Side Project Roulette] Creating user with email: ${email}`);

    if (!email.includes("@")) {
        throw new FatalError("Invalid email format for user creation");
    }

    return {
        id: crypto.randomUUID(),
        email,
    };
}

// Step 2: send welcome email (simulated)
async function sendWelcomeEmail(user: User) {
    "use step";

    console.log(
        `[Side Project Roulette] Sending welcome email to user ${user.id} (${user.email})`
    );

    // Example of an occasional retryable failure
    if (Math.random() < 0.2) {
        throw new Error("Temporary email server issue, please retry");
    }
}

// Step 3: pick a random side project idea
async function assignSideProjectIdea(user: User): Promise<User> {
    "use step";

    const ideas = [
        "AI powered coffee recommendation bot",
        "Luxury sofa configurator for Opulea style furniture",
        "Automated client reporting dashboard for Meta and Google Ads",
        "Wedding content reel generator",
    ];

    const idea = ideas[Math.floor(Math.random() * ideas.length)];

    console.log(
        `[Side Project Roulette] Assigned idea "${idea}" to user ${user.id}`
    );

    return {
        ...user,
        idea,
    };
}

// Step 4: "send" idea email (simulated)
async function sendIdeaEmail(user: User) {
    "use step";

    if (!user.idea) {
        throw new FatalError("No idea was assigned before sending email");
    }

    console.log(
        `[Side Project Roulette] Sending idea email to ${user.email}: ${user.idea}`
    );
}
