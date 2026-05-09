import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const destination = new URL("/ekip", request.url);
  return NextResponse.redirect(destination, 301);
}

export const config = {
  matcher: ["/yonetim-kurulu"],
};
