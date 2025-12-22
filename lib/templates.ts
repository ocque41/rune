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
            { id: '2', type: 'step', position: { x: 250, y: 100 }, data: { label: 'Database Query', dbConfig: { dbType: 'postgres', query: 'SELECT * FROM users WHERE created_at > NOW() - INTERVAL 7 DAY' } } },
            { id: '3', type: 'step', position: { x: 250, y: 200 }, data: { label: 'Send Email', emailConfig: { recipient: 'admin@example.com', subject: 'Weekly Report', body: 'See attached data.' } } },
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3' },
        ]
    },
    {
        id: 'order-processing',
        name: 'Order Processing',
        description: 'End-to-end order fulfillment with payments and notifications.',
        nodes: [
            {
                id: '1',
                type: 'trigger',
                position: { x: 100, y: 100 },
                data: { label: 'Order Created', type: 'webhook' }
            },
            {
                id: '2',
                type: 'step',
                position: { x: 100, y: 200 },
                data: {
                    label: 'Validate Order',
                    type: 'conditional',
                    condition: 'event.total > 0 && event.items.length > 0'
                }
            },
            {
                id: '3',
                type: 'step',
                position: { x: 100, y: 300 },
                data: {
                    label: 'Process Payment',
                    type: 'api-call',
                    url: 'https://api.stripe.com/v1/charges',
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer {{secrets.STRIPE_KEY}}' },
                    body: '{ "amount": {{event.total}}, "currency": "usd", "source": "{{event.token}}" }'
                }
            },
            {
                id: '4',
                type: 'step',
                position: { x: 100, y: 400 },
                data: {
                    label: 'Update Inventory',
                    type: 'database',
                    operation: 'update',
                    table: 'inventory',
                    query: 'UPDATE products SET stock = stock - 1 WHERE id = {{event.product_id}}'
                }
            },
            {
                id: '5',
                type: 'step',
                position: { x: 300, y: 500 },
                data: {
                    label: 'Send Confirmation',
                    type: 'send-email',
                    to: '{{event.customer_email}}',
                    subject: 'Order Confirmation #{{event.order_id}}',
                    body: 'Thank you for your order! Your payment of ${{event.total}} has been processed.'
                }
            },
            {
                id: '6',
                type: 'step',
                position: { x: -100, y: 500 },
                data: {
                    label: 'Notify Shipping',
                    type: 'slack',
                    channel: '#shipping',
                    message: 'New order #{{event.order_id}} ready for fulfillment.'
                }
            }
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3', sourceHandle: 'true' },
            { id: 'e3-4', source: '3', target: '4' },
            { id: 'e4-5', source: '4', target: '5' },
            { id: 'e4-6', source: '4', target: '6' }
        ]
    }
];
