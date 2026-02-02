import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { processPendingEvents } from '@/lib/autonomy/service';
import { executeJob } from '@/lib/autonomy/execution';
import { processPendingMessages } from '@/lib/notifications/process';

export const dynamic = 'force-dynamic';

// POST /api/rune/autonomy/scheduled-check
// Cron handler for autonomy runtime (events, jobs, notifications)
export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.RUNE_CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get('authorization') || '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const headerSecret = req.headers.get('x-rune-cron-secret');
      if (bearer !== cronSecret && headerSecret !== cronSecret) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = createAdminClient();

    // 1. Ingest Events
    await processPendingEvents(supabase);

    // 2. Worker Loop: Lease & Execute Autonomy Jobs
    const { data: leasedJobs, error: leaseError } = await supabase
      .rpc('lease_jobs', {
        worker_name: 'cron-worker-vercel',
        limit_count: 5,
        lease_seconds: 300
      });

    if (leaseError) {
      console.error('[Autonomy Cron] Lease failed:', leaseError);
    } else if (leasedJobs && leasedJobs.length > 0) {
      console.log(`[Autonomy Cron] Leased ${leasedJobs.length} jobs. Executing...`);
      for (const job of leasedJobs) {
        await executeJob(job.id, supabase);
      }
    }

    // 3. Notifications
    const notifications = await processPendingMessages(supabase).catch((e) => ({ error: e.message }));

    return NextResponse.json({
      success: true,
      message: 'Autonomy scheduled check completed',
      notifications
    });
  } catch (error: any) {
    console.error('[Autonomy Cron] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
