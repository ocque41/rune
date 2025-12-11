import type { NextConfig } from "next";

import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['workflow', '@xyflow/react', 'lucide-react'],
};

export default withWorkflow(nextConfig);
// export default nextConfig;