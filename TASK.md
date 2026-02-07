# TASK.md - Current Objective: Develop a Real-time Event Log Viewer for Workflow Runs

## Project: `/Users/miguel/Documents/cumulus/rune`

## Status: Pending

## Objective:

To develop a real-time event log viewer within the Flow Builder UI that displays granular log entries and node outputs as a workflow executes. This will provide users with immediate feedback and detailed insights into workflow execution.

## Description:

The current `FlowBuilder.tsx` already streams `nodeOutput` and `nodeStatus` events. This task focuses on enhancing the existing "Execution Logs Panel" to effectively display these events in a user-friendly, real-time manner, distinguishing between different event types (e.g., general logs, node outputs, node status changes).

## Sub-tasks:

1.  **Refine Event Stream Handling in `FlowBuilder.tsx`:**
    *   Ensure all relevant event types (`nodeOutput`, `nodeStatus`, and any future generic `log` events) are correctly parsed and added to the `executionLogs` state.
    *   Potentially introduce a more structured log entry type (`SimulationLogEntry`) that can differentiate and store metadata for various event kinds.
    *   Consider debouncing/throttling state updates if high-volume streams cause performance issues.
2.  **Enhance Execution Logs Panel UI:**
    *   **Categorize and Filter Logs:** Implement UI elements (e.g., tabs, checkboxes) to allow users to filter logs by type (e.g., all, node output, status changes, errors).
    *   **Visual Distinction for Log Types:** Use distinct styling (colors, icons) for different log entry types (e.g., `running`, `success`, `failure` statuses, `nodeOutput` data).
    *   **Expandable Log Details:** For `nodeOutput` entries, allow users to expand/collapse the JSON data for detailed inspection.
    *   **Timestamp and Node ID Display:** Clearly display the timestamp and the associated `nodeId` for each log entry.
    *   **Auto-scroll to Bottom:** Maintain auto-scrolling behavior to the newest log entry.
3.  **Integrate Animated Feedback:**
    *   Leverage existing `anime.js` setup to add subtle animations for new log entries, improving the perception of real-time updates.
4.  **Implement Unit and Integration Tests:**
    *   **Unit Tests:** Create unit tests for any new helper functions or data structures introduced for log management.
    *   **Integration Tests:** Extend existing integration tests (e.g., `workflow-output-stream.test.ts`) to verify correct display and filtering of different log types in the simulated environment.

## Expected Outcome:

*   A functional, real-time event log viewer integrated into the Flow Builder.
*   Clear visual differentiation and filtering capabilities for log types.
*   Smooth user experience with animated log entries and auto-scrolling.
*   Robust test coverage ensuring the reliability of the log viewer.

## Definition of Done

*   `FlowBuilder.tsx` effectively processes and stores all event stream types.
*   The Execution Logs Panel visibly distinguishes between node status updates, node outputs, and generic log entries.
*   Users can filter log entries by type.
*   Detailed `nodeOutput` data is inspectable.
*   Log entries animate on appearance, and the panel auto-scrolls.
*   New helper functions have unit tests.
*   Integration tests verify the end-to-end log viewing experience.
*   All new code adheres to `Development Rules`.
*   The project builds and runs without errors, and the new feature is functional.

## Next Steps (after completion):

-   Update `TASKS.md` to mark this task as complete.
-   Update `TASK.md` with the next objective.
