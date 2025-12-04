import { sleep } from "workflow";

export const sendEmail = async (params: any) => {
    "use step";
    console.log("Running step: Send Email", params);
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { status: "success", step: "Send Email" };
};

export async function workflow(params: any) {
    "use workflow";

    await sendEmail({});
    await sleep("2s");

    return { result: "Workflow completed" };
}
