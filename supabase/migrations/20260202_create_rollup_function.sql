-- Migration: Create aggregate_daily_usage function
-- Date: 2026-02-02

create or replace function public.aggregate_daily_usage(target_date date default (current_date - interval '1 day'))
returns void
language plpgsql
security definer -- Required to read all users' events to aggregate
as $$
begin
    -- 1. Delete existing rollup for the target date to ensure idempotency
    delete from public.rune_agent_usage_daily_rollup
    where day = target_date;

    -- 2. Insert aggregated data
    insert into public.rune_agent_usage_daily_rollup (
        user_id,
        day,
        model,
        source,
        input_tokens,
        output_tokens,
        total_tokens,
        cached_tokens,
        estimated_cost_usd,
        calls_count,
        errors_count,
        tool_calls_count,
        high_impact_calls_count
    )
    select
        user_id,
        target_date as day,
        model,
        source,
        sum(input_tokens) as input_tokens,
        sum(output_tokens) as output_tokens,
        sum(total_tokens) as total_tokens,
        COALESCE(sum(cached_tokens), 0) as cached_tokens,
        COALESCE(sum(estimated_cost_usd), 0) as estimated_cost_usd,
        count(*) as calls_count,
        sum(case when status = 'error' then 1 else 0 end) as errors_count,
        sum(tool_calls_count) as tool_calls_count,
        sum(case when is_high_impact_tool = true then 1 else 0 end) as high_impact_calls_count
    from
        public.rune_agent_usage_events
    where
        date_trunc('day', created_at) = target_date
    group by
        user_id,
        model,
        source;

    -- 3. Log completion
    raise notice 'Aggregated usage for %', target_date;
end;
$$;
