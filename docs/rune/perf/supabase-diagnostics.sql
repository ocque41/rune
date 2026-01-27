-- Rune Performance Analysis Queries
-- Run these in Supabase SQL Editor to identify bottlenecks
-- 
-- Instructions:
-- 1. Copy each section and run in Supabase Dashboard > SQL Editor
-- 2. Take note of any findings (high seq_scan, slow queries, etc.)
-- 3. Run fixes as needed
-- 4. Reset stats after fixes to measure improvement

-- ==============================================================================
-- SECTION 1: SLOW QUERY IDENTIFICATION
-- ==============================================================================

-- Top 10 slowest queries by total execution time
-- Look for: queries with high total_exec_time or mean_exec_time
SELECT 
  LEFT(query, 100) as query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) as avg_ms,
  ROUND(total_exec_time::numeric, 2) as total_ms,
  ROUND(stddev_exec_time::numeric, 2) as stddev_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND query NOT LIKE '%pg_catalog%'
ORDER BY total_exec_time DESC
LIMIT 10;

-- ==============================================================================
-- SECTION 2: SEQUENTIAL SCAN DETECTION (Missing Indexes)
-- ==============================================================================

-- Tables with high sequential scans
-- Look for: seq_scan > 1000 on production tables (rune_*)
-- Action: Add indexes on frequently filtered columns
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  CASE 
    WHEN seq_scan > 0 THEN ROUND((seq_tup_read::numeric / seq_scan), 0)
    ELSE 0
  END as avg_seq_tuples_per_scan,
  CASE
    WHEN seq_scan > 1000 THEN '🔴 HIGH'
    WHEN seq_scan > 100 THEN '🟡 MEDIUM'
    ELSE '🟢 LOW'
  END as urgency
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'rune_%'
ORDER BY seq_scan DESC;

-- ==============================================================================
-- SECTION 3: INDEX USAGE ANALYSIS
-- ==============================================================================

-- Unused indexes (candidates for removal)
-- Look for: idx_scan = 0 on non-primary-key indexes
-- Action: Consider DROP INDEX if truly unused (saves write overhead)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%pkey%'
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Index cache hit ratio (should be >99%)
-- Look for: cache_hit_ratio < 95%
-- Action: Consider increasing shared_buffers or investigate missing indexes
SELECT 
  ROUND(
    100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0), 
    2
  ) as index_cache_hit_ratio_percent
FROM pg_statio_user_indexes;

-- ==============================================================================
-- SECTION 4: RLS QUERY PLAN ANALYSIS
-- ==============================================================================

-- Workflow list query (with RLS)
-- Expected: Index Scan using idx_rune_workflows_user_updated
-- If you see "Seq Scan", the index is not being used!
EXPLAIN ANALYZE
SELECT id, name, updated_at, status, description
FROM rune_workflows
WHERE user_id = (SELECT auth.uid())
ORDER BY updated_at DESC
LIMIT 20;

-- Runs list query (with RLS)  
-- Expected: Index Scan using idx_rune_runs_user_created
EXPLAIN ANALYZE
SELECT id, workflow_name, status, start_time, duration, created_at
FROM rune_workflow_runs
WHERE user_id = (SELECT auth.uid())
ORDER BY created_at DESC
LIMIT 20;

-- Chats list query (with RLS)
-- Expected: Index Scan using idx_rune_chats_user_lastmsg
EXPLAIN ANALYZE
SELECT id, title, updated_at, is_temporary
FROM rune_chats
WHERE user_id = (SELECT auth.uid())
ORDER BY updated_at DESC
LIMIT 20;

-- ==============================================================================
-- SECTION 5: TABLE BLOAT & MAINTENANCE
-- ==============================================================================

-- Check for table bloat (dead tuples)
-- Look for: n_dead_tup > 10% of n_live_tup
-- Action: Run VACUUM ANALYZE on affected tables
SELECT 
  schemaname,
  tablename,
  n_live_tup,
  n_dead_tup,
  CASE 
    WHEN n_live_tup > 0 
    THEN ROUND(100.0 * n_dead_tup / n_live_tup, 2)
    ELSE 0
  END as dead_tup_percent,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'rune_%'
ORDER BY dead_tup_percent DESC;

-- ==============================================================================
-- SECTION 6: CONNECTION & RESOURCE USAGE
-- ==============================================================================

-- Active connections and queries
SELECT 
  datname,
  COUNT(*) as connections,
  COUNT(*) FILTER (WHERE state = 'active') as active,
  COUNT(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
GROUP BY datname;

-- Long-running queries (> 1 second)
SELECT 
  pid,
  now() - query_start as duration,
  state,
  LEFT(query, 100) as query_preview
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > interval '1 second'
ORDER BY duration DESC;

-- ==============================================================================
-- SECTION 7: VERIFY INDEXES EXIST
-- ==============================================================================

-- Check if our performance indexes are in place
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_rune_workflows_user%'
    OR indexname LIKE 'idx_rune_runs_user%'
    OR indexname LIKE 'idx_rune_chats_user%'
  )
ORDER BY tablename, indexname;

-- ==============================================================================
-- SECTION 8: RESET STATS (Run AFTER fixes to measure improvement)
-- ==============================================================================

-- Reset query statistics
-- WARNING: This clears historical data. Only run when ready to measure fresh metrics.
-- SELECT pg_stat_statements_reset();

-- Reset table/index statistics  
-- SELECT pg_stat_reset();

-- ==============================================================================
-- SECTION 9: CREATE MISSING INDEXES (If needed)
-- ==============================================================================

-- Run if indexes from 20260127_optimize_dashboard.sql are missing

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rune_workflows_user_updated 
-- ON rune_workflows(user_id, updated_at DESC);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rune_runs_user_created
-- ON rune_runs(user_id, created_at DESC);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rune_chats_user_lastmsg
-- ON rune_chats(user_id, updated_at DESC);

-- Verify index creation
-- SELECT schemaname, tablename, indexname 
-- FROM pg_indexes 
-- WHERE indexname IN (
--   'idx_rune_workflows_user_updated',
--   'idx_rune_runs_user_created', 
--   'idx_rune_chats_user_lastmsg'
-- );
