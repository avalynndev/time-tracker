const HACKATIME_API_URL = "https://hackatime.hackclub.com/api";
const HACKATIME_API_TOKEN = "";

export interface HackatimeProject {
  name: string;
  hours: number;
}

export interface HackatimeUser {
  user_id: string;
  email?: string;
}

export interface HackatimeStatsResponse {
  data?: {
    projects?: Array<{
      name: string;
      total_seconds: number;
      text: string;
      hours: number;
      minutes: number;
      percent: number;
      digital: string;
    }>;
  };
  [key: string]: any;
}

async function exponentialFetchRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  baseDelay: number = 1000
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

export async function fetchProjects(
  email: string,
  startDate?: string | null
): Promise<HackatimeStatsResponse> {
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${HACKATIME_API_TOKEN}`,
    };

    const lookupUrl = `${HACKATIME_API_URL}/v1/users/lookup_email/${encodeURIComponent(
      email
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

      throw new Error(
        `HTTP error! status: ${lookupResponse.status} - ${errorDetails}`
      );
    }

    const userData: HackatimeUser = await lookupResponse.json();
    const hackatimeId = userData.user_id;

    if (!hackatimeId) {
      throw new Error("User ID not found in response");
    }

    let statsUrl = `${HACKATIME_API_URL}/v1/users/${hackatimeId}/stats?features=projects`;

    if (startDate) {
      const currentTime = new Date().toISOString();
      statsUrl += `&start_date=${startDate}&end_date=${currentTime}`;
    }

    console.log("Fetching stats from URL:", statsUrl);

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

      throw new Error(
        `HTTP error! status: ${statsResponse.status} - ${errorDetails}`
      );
    }

    const statsData: HackatimeStatsResponse = await statsResponse.json();
    return statsData;
  } catch (error) {
    console.error("Error fetching projects from HackaTime:", error);
    throw error;
  }
}

export function formatHours(hours: number): string {
  const totalSeconds = hours * 3600;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60);

  const hoursPart = Math.floor(totalMinutes / 60);
  const minutesPart = totalMinutes % 60;

  if (hoursPart > 0) {
    if (minutesPart > 0) {
      return `${hoursPart}h ${minutesPart}m`;
    } else {
      return `${hoursPart}h`;
    }
  } else if (minutesPart > 0) {
    return `${minutesPart}m`;
  } else {
    return `${remainingSeconds}s`;
  }
}

export function calculateTotalHours(projects: HackatimeProject[]): number {
  return projects.reduce((total, project) => total + project.hours, 0);
}
