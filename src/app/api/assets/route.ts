import { NextResponse } from "next/server";
import {
  buildDefaultAliasDictionary,
} from "@/components/tools/correlation/universal-asset-comparison";
import { AssetsApiResponseSchema } from "@/lib/contracts/universal-asset-schemas";
import { marketDataGateway } from "@/lib/gateways/market-data-gateway";

export const revalidate = 300;

export async function GET() {
  const payload = AssetsApiResponseSchema.parse({
    assets: marketDataGateway.getSupportedAssets(),
    aliasDictionary: buildDefaultAliasDictionary(),
  });
  return NextResponse.json(payload, { status: 200 });
}
