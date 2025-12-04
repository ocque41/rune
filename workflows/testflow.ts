export async function workflow(params: any) {
    "use workflow";
    console.log("Test workflow running with params:", params);
    return { result: "ok", timestamp: new Date().toISOString() };
}