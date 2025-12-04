import { Node, Edge } from '@xyflow/react';

export type Template = {
    id: string;
    name: string;
    description: string;
    nodes: Node[];
    edges: Edge[];
};

export const templates: Template[] = [
    {
        id: 'email-drip',
        name: 'Email Drip Campaign',
        description: 'Send a sequence of emails with delays between them.',
        nodes: [
            { id: '1', type: 'step', position: { x: 250, y: 0 }, data: { label: 'Start Workflow' } },
            { id: '2', type: 'step', position: { x: 250, y: 100 }, data: { label: 'Send Email', emailConfig: { recipient: 'user@example.com', subject: 'Welcome!', body: 'Thanks for signing up.' } } },
            { id: '3', type: 'step', position: { x: 250, y: 200 }, data: { label: 'Sleep', config: { timeout: '1d' } } },
            { id: '4', type: 'step', position: { x: 250, y: 300 }, data: { label: 'Send Email', emailConfig: { recipient: 'user@example.com', subject: 'Day 2 Check-in', body: 'How are you finding things?' } } },
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3' },
            { id: 'e3-4', source: '3', target: '4' },
        ]
    },
    {
        id: 'approval-chain',
        name: 'Approval Chain',
        description: 'Wait for manager approval before proceeding.',
        nodes: [
            { id: '1', type: 'step', position: { x: 250, y: 0 }, data: { label: 'Start Workflow' } },
            { id: '2', type: 'step', position: { x: 250, y: 100 }, data: { label: 'Wait for Event', waitConfig: { event: 'manager-approval' } } },
            { id: '3', type: 'if', position: { x: 250, y: 200 }, data: { label: 'Approved?', condition: 'params.data.approved === true' } },
            { id: '4', type: 'step', position: { x: 100, y: 350 }, data: { label: 'Send Email', emailConfig: { recipient: 'user@example.com', subject: 'Approved', body: 'Your request was approved.' } } },
            { id: '5', type: 'step', position: { x: 400, y: 350 }, data: { label: 'Send Email', emailConfig: { recipient: 'user@example.com', subject: 'Rejected', body: 'Your request was rejected.' } } },
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3' },
            { id: 'e3-4', source: '3', target: '4', sourceHandle: 'true' },
            { id: 'e3-5', source: '3', target: '5', sourceHandle: 'false' },
        ]
    },
    {
        id: 'cron-report',
        name: 'Scheduled Report',
        description: 'Run a database query every Monday and email the results.',
        nodes: [
            { id: '1', type: 'schedule', position: { x: 250, y: 0 }, data: { label: 'Schedule', cron: '0 9 * * 1' } },
            { id: '2', type: 'step', position: { x: 250, y: 100 }, data: { label: 'Database Query', dbConfig: { query: 'SELECT * FROM users WHERE created_at > NOW() - INTERVAL 7 DAY' } } },
            { id: '3', type: 'step', position: { x: 250, y: 200 }, data: { label: 'Send Email', emailConfig: { recipient: 'admin@example.com', subject: 'Weekly Report', body: 'See attached data.' } } },
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3' },
        ]
    }
];
