# TASK.md - Current Objective: Verification of Gemini 3 Agent Runtime

## Project: `/Users/miguel/Documents/cumulus/rune`

## Status: In Progress

## Objective:

To thoroughly verify the functionality and stability of the Gemini 3 Agent Runtime within the `/Users/miguel/Documents/cumulus/rune` project. This includes testing basic chat interactions, tool usage, and multi-step agent operations to ensure proper integration and performance.

## Description:

The Gemini 3 Agent Runtime has been refactored to support server-side tool execution with "Thought Signature" preservation and is integrated into the Agent Playground. This task focuses on a "Soak Test" approach to validate its behavior under various conditions. The soak test will initially be manual and then transition to an automated script.

## Sub-tasks:

1.  **Understand Agent Playground Interaction:**
    *   Identify the primary interface for interacting with the Gemini 3 Agent Runtime within the Agent Playground.
    *   Determine how to submit prompts and observe responses, including tool execution logs and thought processes.
2.  **Manual Soak Test Execution:**
    *   Confirmed the `ai_node_debug.test.ts` passes, verifying core AI node execution within the WorkflowEngine.
    *   Manual execution of test cases (Simple chat, Tool usage, Multi-step) is currently pending as the `rune` application needs to be running.

3.  **Document Manual Test Results:**
    *   Record observations, successful outputs, and any issues encountered during the manual tests.
    *   Note down the expected behavior versus actual behavior.
4.  **Develop Automated Soak Test Script (Future Step):**
    *   (Once manual testing confirms basic functionality) Design and implement an automated script to repeatedly run the identified test cases.
    *   The script should capture agent responses and tool interactions for automated assertion.

## Expected Outcome:

*   A clear understanding of how to interact with the Gemini 3 Agent Runtime via the Agent Playground.
*   Confirmation that the agent can handle simple chat, tool usage, and multi-step commands as expected.
*   Detailed documentation of manual test results, identifying any areas requiring further attention.
*   (Eventually) An automated soak test script for continuous validation.

## Definition of Done

*   The Gemini 3 Agent Runtime is accessible and interactive within the Agent Playground.
*   Manual execution of Test Case 1 ("Simple chat") is successful.
*   Manual execution of Test Case 2 ("Tool usage") is successful, with tool invocation and output processed correctly.
*   Manual execution of Test Case 3 ("Multi-step") is successful, demonstrating multi-step reasoning and execution.
*   All observations and results from manual tests are documented.
*   All new code (for automated script, if developed in this task) adheres to `Development Rules`.
*   The project builds and runs without errors, and the agent runtime functions as verified.

## Next Steps (after completion):

-   Update `TASKS.md` to mark "Verification of Gemini 3 Agent Runtime" as complete.
-   Update `TASK.md` with the next objective.
