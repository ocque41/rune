CREATE OR REPLACE FUNCTION lease_jobs(
    worker_name text,
    limit_count int,
    lease_seconds int
)
RETURNS TABLE (id uuid)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE rune_agent_jobs
    SET leased_until = now() + (lease_seconds || ' seconds')::interval,
        worker_id = worker_name
    WHERE rune_agent_jobs.id IN (
        SELECT j.id FROM rune_agent_jobs j
        WHERE j.status IN ('pending', 'running')
        AND (j.leased_until IS NULL OR j.leased_until < now())
        ORDER BY j.priority DESC, j.created_at ASC
        LIMIT limit_count
        FOR UPDATE SKIP LOCKED
    )
    RETURNING rune_agent_jobs.id;
END;
$$;
