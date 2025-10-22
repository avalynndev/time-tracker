"use client";
import { useState, useEffect, useRef } from "react";

interface Heartbeat {
  time: string;
  project?: string;
  [key: string]: any;
}

interface Project {
  name: string;
  heartbeats: Heartbeat[];
}

export default function SiegeTracker() {
  const [apiKey, setApiKey] = useState<string>("");
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set()
  );
  const [hoursWorked, setHoursWorked] = useState<number>(0);
  const [minutesWorked, setMinutesWorked] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const MAX_HOURS = 75;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  const START_DATE = "2025-10-13T18:31:00Z";

  const totalWorked = hoursWorked + minutesWorked / 60;
  const percentage = Math.min((totalWorked / MAX_HOURS) * 100, 100);
  const siegeComplete = totalWorked >= MAX_HOURS;

  const fetchHackatimeData = async () => {
    if (!apiKey) {
      setError("Please enter your API key");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const end = new Date().toISOString();
      const res = await fetch(
        `https://hackatime.hackclub.com/api/v1/my/heartbeats?start_time=${START_DATE}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch Hackatime data. Check your API key.");
      }

      const data = await res.json();

      if (!data.heartbeats || !Array.isArray(data.heartbeats)) {
        throw new Error("Unexpected data format from API");
      }

      const projectMap = new Map();
      data.heartbeats.forEach((heartbeat:any) => {
        const project = heartbeat.project || "Unknown Project";
        if (!projectMap.has(project)) {
          projectMap.set(project, { name: project, heartbeats: [] });
        }
        projectMap.get(project).heartbeats.push(heartbeat);
      });

      const projectsList = Array.from(projectMap.values());
      setProjects(projectsList);

      const allProjectNames = new Set(projectsList.map((p) => p.name));
      setSelectedProjects(allProjectNames);

      calculateTimeFromHeartbeats(data.heartbeats);

      setIsApiKeySet(true);
    } catch (err) {
      setError("error");
      console.error("Error fetching Hackatime data:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeFromHeartbeats = (heartbeats: Heartbeat[]) => {
    if (!heartbeats || heartbeats.length === 0) {
      setHoursWorked(0);
      setMinutesWorked(0);
      return;
    }

    const sorted = [...heartbeats].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    let totalSeconds = 0;
    const GAP_THRESHOLD = 15 * 60;

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = new Date(sorted[i].time);
      const next = new Date(sorted[i + 1].time);
      const gap = (next.getTime() - current.getTime()) / 1000;

      if (gap <= GAP_THRESHOLD) {
        totalSeconds += gap;
      } else {
        totalSeconds += 120;
      }
    }

    totalSeconds += 120;

    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    setHoursWorked(hours);
    setMinutesWorked(minutes);
  };

  useEffect(() => {
    if (projects.length === 0 || selectedProjects.size === 0) return;

    const selectedHeartbeats = projects
      .filter((p) => selectedProjects.has(p.name))
      .flatMap((p) => p.heartbeats);

    calculateTimeFromHeartbeats(selectedHeartbeats);
  }, [selectedProjects, projects]);

  const toggleProject = (projectName:any) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectName)) {
      newSelected.delete(projectName);
    } else {
      newSelected.add(projectName);
    }
    setSelectedProjects(newSelected);
  };

  const selectAllProjects = () => {
    setSelectedProjects(new Set(projects.map((p) => p.name)));
  };

  const deselectAllProjects = () => {
    setSelectedProjects(new Set());
  };

  useEffect(() => {
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!svg || !path) return;

    const total = path.getTotalLength();
    const lenAtPct = total * (1 - percentage / 100);
    const pt = path.getPointAtLength(lenAtPct);

    const userMarkerEl = document.getElementById("userMarker");
    if (userMarkerEl instanceof SVGForeignObjectElement) {
      const uw = 84;
      const uh = 84;

      if (percentage >= 100) {
        const endPt = path.getPointAtLength(0);
        const castleCenterX = endPt.x + 12 + 170;
        const castleCenterY = endPt.y - 36;
        const feetX = castleCenterX;
        const feetY = castleCenterY + 40;

        userMarkerEl.setAttribute("x", (feetX - uw / 2).toString());
        userMarkerEl.setAttribute("y", (feetY - uh).toString());
        userMarkerEl.setAttribute("transform", `rotate(-8 ${feetX} ${feetY})`);
      } else {
        const feetX = pt.x;
        const feetY = pt.y;
        userMarkerEl.setAttribute("x", (feetX - uw / 2).toString());
        userMarkerEl.setAttribute("y", (feetY - uh).toString());

        const delta = 2;
        const prevLen = Math.max(0, lenAtPct - delta);
        const nextLen = Math.min(total, lenAtPct + delta);
        const prevPt = path.getPointAtLength(prevLen);
        const nextPt = path.getPointAtLength(nextLen);

        let angle =
          (Math.atan2(nextPt.y - prevPt.y, nextPt.x - prevPt.x) * 180) /
          Math.PI;
        if (angle > 90) angle -= 180;
        if (angle < -90) angle += 180;
        angle -= 3;

        userMarkerEl.setAttribute(
          "transform",
          `rotate(${angle} ${feetX} ${feetY})`
        );
      }
    }

    const completedRectEl = document.getElementById("completedRect");
    if (completedRectEl instanceof SVGRectElement) {
      const curr = path.getPointAtLength(lenAtPct);
      const samples = 48;
      let minX = curr.x,
        maxX = curr.x,
        minY = curr.y,
        maxY = curr.y;

      for (let i = 0; i <= samples; i++) {
        const t = lenAtPct + (i / samples) * (total - lenAtPct);
        const p = path.getPointAtLength(t);
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }

      const strokePad = 8;
      const rectX = Math.min(minX, curr.x) - strokePad;
      const rectW = Math.max(
        0,
        Math.max(maxX, curr.x) + strokePad * 0.25 - rectX
      );

      completedRectEl.setAttribute("x", rectX.toString());
      completedRectEl.setAttribute("y", (minY - 12.8).toString());
      completedRectEl.setAttribute("width", rectW.toString());
      completedRectEl.setAttribute("height", (maxY - minY + 25.6).toString());
    }

    const groupEl = document.getElementById("waveGroup");
    if (groupEl instanceof SVGGElement) {
      const bbox = groupEl.getBBox();
      const pad = 12;
      svg.setAttribute(
        "viewBox",
        `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${
          bbox.height + pad * 2
        }`
      );
    }
  }, [percentage]);

  const reset = () => {
    setHoursWorked(0);
    setMinutesWorked(0);
    setProjects([]);
    setSelectedProjects(new Set());
    setIsApiKeySet(false);
    setApiKey("");
  };

  if (!isApiKeySet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white/90 backdrop-blur border-2 border-amber-200 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🏰</div>
            <h1
              className="text-3xl font-bold text-amber-900 mb-2"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Castle Siege Tracker
            </h1>
            <p className="text-amber-700">
              Track your coding journey to 75 hours!
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-amber-800 font-semibold mb-2">
              Hackatime API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:outline-none focus:border-amber-500"
            />
            <p className="text-sm text-amber-600 mt-2">
              Get your API key from{" "}
              <a
                href="https://hackatime.hackclub.com/my/wakatime_setup"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-800"
              >
                Hackatime Setup
              </a>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={fetchHackatimeData}
            disabled={loading || !apiKey}
            className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            {loading ? "Loading..." : "Start Siege 🗡️"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center text-4xl font-bold text-amber-900 mb-8">
          {siegeComplete
            ? "🏰 You've conquered the castle!"
            : `⚔️ ${percentage.toFixed(1)}% of the way there!`}
        </div>

        <div className="relative w-full flex justify-center mb-8">
          <svg
            ref={svgRef}
            className="home-wave w-full max-w-5xl h-[340px]"
            viewBox="-221.5 -91.61527252197266 1143 241.68777465820312"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <path
                ref={pathRef}
                id="wavePath"
                d="M557.5 93.3031C201.5 251 296 -65.5 2.5 22.4998"
              />
              <clipPath id="completedClip" clipPathUnits="userSpaceOnUse">
                <rect
                  id="completedRect"
                  x="-5.5"
                  y="-0.8469"
                  width="52.63"
                  height="31.14"
                  rx="10"
                  ry="10"
                />
              </clipPath>
            </defs>

            <g id="waveGroup">
              <use
                href="#wavePath"
                className="fill-none stroke-amber-400/40"
                strokeDasharray="20 14"
                strokeLinecap="round"
                strokeWidth="8"
              />
              <g clipPath="url(#completedClip)">
                <use
                  href="#wavePath"
                  className="fill-none stroke-amber-800"
                  strokeDasharray="20 14"
                  strokeLinecap="round"
                  strokeWidth="8"
                />
              </g>

              <image
                id="castleStart"
                href="/castle-c90bfbb4.webp"
                x="-209.5"
                y="-19.55"
                width="200"
                height="84.1"
              />
              <image
                id="castleEnd"
                href="/castle-c90bfbb4.webp"
                x="569.5"
                y="-14.14"
                width="340"
                height="142.9"
              />

              <foreignObject
                id="userMarker"
                x="3.13"
                y="-72.04"
                width="84"
                height="84"
                transform="rotate(-13.7 45.13 11.95)"
              >
                <div className="relative w-[84px] h-[84px] overflow-visible">
                  <img
                    src="/meeple-purple-72df198d.png"
                    alt="purple meeple"
                    className="absolute top-0 left-0 w-[84px] h-[84px] object-contain"
                  />
                </div>
              </foreignObject>
            </g>
          </svg>
        </div>

        {projects.length > 0 && (
          <div className="bg-white/80 backdrop-blur border-2 border-amber-200 rounded-2xl shadow-xl p-8 mb-6">
            <h2
              className="text-3xl font-bold text-amber-900 text-center mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Select Projects
            </h2>
            <p className="text-center text-amber-700 mb-4">
              Choose which projects to track (since Oct 13, 2025)
            </p>

            <div className="flex justify-center gap-3 mb-4">
              <button
                onClick={selectAllProjects}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow transition-transform hover:scale-105"
              >
                Select All
              </button>
              <button
                onClick={deselectAllProjects}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg shadow transition-transform hover:scale-105"
              >
                Deselect All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2">
              {projects.map((project) => (
                <label
                  key={project.name}
                  className="flex items-center gap-2 p-3 border-2 border-amber-200 rounded-lg hover:bg-amber-50 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedProjects.has(project.name)}
                    onChange={() => toggleProject(project.name)}
                    className="w-5 h-5 accent-amber-600"
                  />
                  <span className="text-amber-900 font-medium truncate">
                    {project.name}
                  </span>
                  <span className="text-xs text-amber-600 ml-auto">
                    ({project.heartbeats.length})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur border-2 border-amber-200 rounded-2xl shadow-xl p-8 mb-6">
          <h2
            className="text-3xl font-bold text-amber-900 text-center mb-6"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Your Progress
          </h2>

          <div className="text-center text-3xl font-bold text-amber-900 mb-4">
            {totalWorked === 0
              ? "You haven't started yet!"
              : `${hoursWorked}h ${minutesWorked}m logged!`}
          </div>

          <div className="text-center text-lg text-amber-700">
            {selectedProjects.size} project
            {selectedProjects.size !== 1 ? "s" : ""} selected
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={fetchHackatimeData}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-md transition-transform hover:scale-110 active:scale-95"
            >
              {loading ? "Refreshing..." : "🔄 Refresh Data"}
            </button>
            <button
              onClick={reset}
              className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition-transform hover:scale-110 active:scale-95"
            >
              🔒 Reset & Change Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
