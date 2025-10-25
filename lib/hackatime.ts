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

export async function fetchProjects(
  email: string,
  startDate?: string | null,
): Promise<HackatimeStatsResponse> {
  try {
    const params = new URLSearchParams({ email });
    if (startDate) {
      params.append("startDate", startDate);
    }

    const response = await fetch(`/api/hackatime?${params.toString()}`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
    }

    const statsData: HackatimeStatsResponse = await response.json();
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
