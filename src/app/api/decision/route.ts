import { NextResponse } from "next/server";
import {
  DecisionRequestSchema,
  DecisionResponseSchema,
} from "@/lib/contracts/universal-asset-schemas";
import { decisionEngineService } from "@/lib/services/decision-engine-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = DecisionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Karar isteği geçersiz.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const decision = await decisionEngineService.runDecisionQuery(
    parsed.data.query,
    parsed.data.currentRiskProfile
  );

  const response = DecisionResponseSchema.parse(decision);
  return NextResponse.json(response, { status: 200 });
}
