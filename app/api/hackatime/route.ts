import { NextRequest, NextResponse } from "next/server";

const HACKATIME_API_URL = "https://hackatime.hackclub.com/api";
const HACKATIME_API_TOKEN = process.env.HACKATIME_API_TOKEN || "";

async function exponentialFetchRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<Response> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");
    const startDate = searchParams.get("startDate");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 },
      );
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${HACKATIME_API_TOKEN}`,
    };

    const lookupUrl = `${HACKATIME_API_URL}/v1/users/lookup_email/${encodeURIComponent(
      email,
    )}`;

    const lookupResponse = await exponentialFetchRetry(lookupUrl, {
      method: "GET",
      headers,
    });

    if (!lookupResponse.ok) {
      let errorDetails = "";
      try {
        errorDetails = await lookupResponse.text();
      } catch (e) {
        errorDetails = "Could not read error response";
      }

      return NextResponse.json(
        { error: `Failed to lookup user: ${errorDetails}` },
        { status: lookupResponse.status },
      );
    }

    const userData = await lookupResponse.json();
    const hackatimeId = userData.user_id;

    if (!hackatimeId) {
      return NextResponse.json(
        { error: "User ID not found in response" },
        { status: 404 },
      );
    }

    let statsUrl = `${HACKATIME_API_URL}/v1/users/${hackatimeId}/stats?features=projects`;

    if (startDate) {
      const currentTime = new Date().toISOString();
      statsUrl += `&start_date=${startDate}&end_date=${currentTime}`;
    }

    const statsResponse = await exponentialFetchRetry(statsUrl, {
      method: "GET",
    });

    if (!statsResponse.ok) {
      let errorDetails = "";
      try {
        errorDetails = await statsResponse.text();
      } catch (e) {
        errorDetails = "Could not read error response";
      }

      return NextResponse.json(
        { error: `Failed to fetch stats: ${errorDetails}` },
        { status: statsResponse.status },
      );
    }

    const statsData = await statsResponse.json();
    return NextResponse.json(statsData);
  } catch (error) {
    console.error("Error in hackatime API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
