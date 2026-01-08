import { NextResponse } from 'next/server';

export async function GET() {
    // Simulate some network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const tools = [
        { id: 'web_search', name: 'Web Search', description: 'Search the internet for current information.', source: 'Brave' },
        { id: 'calculator', name: 'Calculator', description: 'Perform mathematical calculations.', source: 'System' },
        { id: 'git_status', name: 'Git Status', description: 'Check the status of the repository.', source: 'Filesystem' },
        { id: 'query_db', name: 'Query Database', description: 'Execute read-only SQL queries.', source: 'Postgres' },
        { id: 'send_email', name: 'Send Email', description: 'Send an email to a recipient.', source: 'Resend' },
        { id: 'generate_image', name: 'Generate Image', description: 'Create an image based on a prompt.', source: 'DALL-E' },
    ];

    return NextResponse.json(tools);
}
