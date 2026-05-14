import { NextResponse } from "next/server";
import { DiscoveryJobStatusResponseSchema } from "@/lib/contracts/discover-job-schemas";
import { getDiscoveryJob } from "@/lib/services/discovery-engine";

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = getDiscoveryJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Discovery job not found or expired." }, { status: 404 });
  }

  const payload = DiscoveryJobStatusResponseSchema.parse({ job });
  return NextResponse.json(payload, { status: 200 });
}
