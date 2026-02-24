import { Node, Edge } from '@xyflow/react';
import type { WorkflowMode, WorkflowModeConfig } from '@/lib/workflow/modes';

export type Template = {
    id: string;
    name: string;
    description: string;
    workflow_mode?: WorkflowMode;
    workflow_mode_config?: WorkflowModeConfig;
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
        description: 'End-to-end order fulfillment simulation: Validation, Inventory Check, Payment, and Notifications.',
        nodes: [
            // 1. Start
            {
                id: '1',
                type: 'step',
                position: { x: 250, y: 0 },
                data: {
                    label: 'Start Workflow',
                    description: 'Triggered with { orderId, amount, email }'
                }
            },
            // 2. Validation Script
            {
                id: '2',
                type: 'step',
                position: { x: 250, y: 100 },
                data: {
                    label: 'Run Script',
                    description: 'Validate Order Schema',
                    scriptConfig: {
                        code: `
if (!params.amount || !params.email) {
  throw new Error("Invalid Order: Missing amount or email");
}
return params;
`
                    }
                }
            },
            // 3. Mock Inventory Check
            {
                id: '3',
                type: 'step',
                position: { x: 250, y: 250 },
                data: {
                    label: 'HTTP Request',
                    description: 'Check Inventory (Mock)',
                    httpRequest: {
                        method: 'GET',
                        url: 'https://dummyjson.com/products/1', // Returns stock: 94
                    }
                }
            },
            // 4. Decision: In Stock?
            {
                id: '4',
                type: 'if',
                position: { x: 250, y: 400 },
                data: {
                    label: 'In Stock?',
                    condition: 'params.data.stock > 0'
                }
            },
            // --- Branch A: In Stock ---
            // 5. Calculate Total
            {
                id: '5',
                type: 'transform',
                position: { x: 50, y: 550 },
                data: {
                    label: 'Transform',
                    mapping: `
const tax = 0.10;
const shipping = 15;
const total = params.inputs['1'].amount * (1 + tax) + shipping;
return { ...params.inputs['1'], total, status: 'confirmed' };
`
                }
            },
            // 6. Process Payment (Mock)
            {
                id: '6',
                type: 'step',
                position: { x: 50, y: 700 },
                data: {
                    label: 'HTTP Request',
                    description: 'Process Payment (Mock)',
                    httpRequest: {
                        method: 'POST',
                        url: 'https://httpbin.org/post',
                        body: '{"status": "paid", "amount": {{5.result.total}} }',
                        headers: '{"Content-Type": "application/json"}'
                    }
                }
            },
            // 7. Success Email
            {
                id: '7',
                type: 'step',
                position: { x: 50, y: 850 },
                data: {
                    label: 'Send Email',
                    emailConfig: {
                        recipient: 'customer@example.com',
                        subject: 'Order Confirmed',
                        body: 'Your order has been confirmed and paid. Total: ${{5.result.total}}'
                    }
                }
            },
            // --- Branch B: Out of Stock ---
            // 8. Log Error
            {
                id: '8',
                type: 'step',
                position: { x: 500, y: 550 },
                data: {
                    label: 'Run Script',
                    description: 'Log Backorder',
                    scriptConfig: {
                        code: `console.log("Backorder for:", params.inputs['1']); return { status: 'backordered' };`
                    }
                }
            },
            // 9. Apology Email
            {
                id: '9',
                type: 'step',
                position: { x: 500, y: 700 },
                data: {
                    label: 'Send Email',
                    emailConfig: {
                        recipient: 'customer@example.com',
                        subject: 'Order Delayed',
                        body: 'We are sorry, but your item is currently out of stock.'
                    }
                }
            },
            // 10. Slack Notification (Common End)
            {
                id: '10',
                type: 'step',
                position: { x: 250, y: 1000 },
                data: {
                    label: 'Slack Message',
                    slackConfig: {
                        webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXX',
                        message: 'Order processing completed.'
                    }
                }
            }
        ],
        edges: [
            { id: 'start-val', source: '1', target: '2' },
            { id: 'val-inv', source: '2', target: '3' },
            { id: 'inv-check', source: '3', target: '4' },
            // True Path
            { id: 'check-calc', source: '4', target: '5', sourceHandle: 'true', label: 'Yes' },
            { id: 'calc-pay', source: '5', target: '6' },
            { id: 'pay-email', source: '6', target: '7' },
            { id: 'email-end', source: '7', target: '10' },
            // False Path
            { id: 'check-log', source: '4', target: '8', sourceHandle: 'false', label: 'No' },
            { id: 'log-email', source: '8', target: '9' },
            { id: 'email-end-2', source: '9', target: '10' }
        ]
    }
];
