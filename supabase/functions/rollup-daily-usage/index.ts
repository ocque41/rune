import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
    try {
        // secure the function with a secret check if expecting external call,
        // or just rely on Supabase Service Role for cron context.

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Call the RPC function
        // Optional: Parse ?date=YYYY-MM-DD from URL to backfill
        const url = new URL(req.url)
        const targetDate = url.searchParams.get('date')

        const { error } = await supabase.rpc('aggregate_daily_usage', {
            target_date: targetDate || undefined // undefined lets the default (yesterday) take over
        })

        if (error) throw error

        return new Response(JSON.stringify({ message: 'Rollup completed successfully' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
