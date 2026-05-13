import { NextResponse } from "next/server";
import { DiscoveryJobStatusResponseSchema } from "@/lib/contracts/discover-job-schemas";
import { getDiscoveryJob } from "@/lib/services/discovery-engine";

interface JobRouteContext {
  params: {
    jobId: string;
  };
}

export async function GET(_: Request, context: JobRouteContext) {
  const job = getDiscoveryJob(context.params.jobId);
  if (!job) {
    return NextResponse.json({ error: "Discovery job not found or expired." }, { status: 404 });
  }

  const payload = DiscoveryJobStatusResponseSchema.parse({ job });
  return NextResponse.json(payload, { status: 200 });
}
