// app/api/rune/execute-custom-code/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function isInternalRequest(request: Request): boolean {
  const expectedToken = process.env.RUNE_INTERNAL_API_TOKEN;
  if (!expectedToken) {
    return false;
  }

  const providedToken = request.headers.get('x-rune-internal-token');
  return !!providedToken && providedToken === expectedToken;
}

export async function POST(request: Request) {
  try {
    if (!isInternalRequest(request)) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { status: 'error', message: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const { language, code, entrypoint, input, timeoutMs, dependencies, envVars } = await request.json();

    const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);

    if (isSandbox) {
      console.log("[Custom Code Proxy] Sandbox execution request received:");
      console.log("  Language:", language);
      console.log("  Entrypoint:", entrypoint);
      console.log("  Input:", JSON.stringify(input));
      console.log("  Code length:", code.length);
      
      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

      return NextResponse.json({
        status: 'success',
        result: {
          simulated: true,
          language,
          entrypoint,
          input,
          processedCodeLength: code.length,
          message: `Successfully simulated ${language} code execution in sandbox.`
        },
        logs: [`Sandbox: Executed ${entrypoint} in ${language} with input: ${JSON.stringify(input)}`],
        durationMs: 100
      });
    }

    // In live mode, forward to the actual external code execution service
    const externalServiceUrl = process.env.CUSTOM_CODE_EXEC_SERVICE_URL;

    if (!externalServiceUrl) {
      console.error("[Custom Code Proxy] CUSTOM_CODE_EXEC_SERVICE_URL is not set for live mode.");
      return NextResponse.json(
        { status: 'error', message: 'External code execution service URL not configured.' },
        { status: 500 }
      );
    }

    const externalResponse = await fetch(externalServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass through any relevant headers for authentication or correlation
        'X-Rune-Run-Id': request.headers.get('X-Rune-Run-Id') || '',
        'X-Rune-Node-Id': request.headers.get('X-Rune-Node-Id') || '',
        // Add API Key for external service if needed
        // 'Authorization': `Bearer ${process.env.EXTERNAL_CODE_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({ language, code, entrypoint, input, timeoutMs, dependencies, envVars }),
    });

    if (!externalResponse.ok) {
      const errorData = await externalResponse.json().catch(() => ({ message: 'Unknown error from external service.' }));
      console.error("[Custom Code Proxy] External service error:", externalResponse.status, errorData);
      return NextResponse.json(
        { status: 'error', message: `External service responded with error: ${externalResponse.status} - ${errorData.message || 'Unknown'}` },
        { status: externalResponse.status }
      );
    }

    const responseData = await externalResponse.json();
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("[Custom Code Proxy] Internal server error:", error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error processing custom code request.', error: error.message },
      { status: 500 }
    );
  }
}
