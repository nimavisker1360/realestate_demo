import { NextRequest, NextResponse } from "next/server";
import { readListingFilters } from "../../../lib/listingParams";
import { getProperties } from "../../../lib/server/getProperties";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const filters = readListingFilters(request.nextUrl.searchParams);
    const payload = await getProperties(filters);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/properties failed:", error);
    return NextResponse.json(
      { message: "Failed to load properties." },
      { status: 500 },
    );
  }
}
