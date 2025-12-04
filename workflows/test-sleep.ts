import { sleep } from "workflow";

export const sendEmail = async (params: any) => {
    "use step";
    console.log("Running step: Send Email", params);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { status: "success", step: "Send Email" };
};

export async function workflow(params: any) {
    "use workflow";

    console.log("Workflow started", params);
    await sendEmail({});
    await sleep("3s");
    console.log("After 3s sleep");
    await sleep("2s");
    console.log("Workflow complete");

    return { result: "Workflow completed" };
}
