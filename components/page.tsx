"use client";
import { useState, useEffect, useRef } from "react";
import {
  fetchProjects,
  formatHours,
  calculateTotalHours,
} from "@/lib/hackatime";
import Image from "next/image";

interface Project {
  name: string;
  hours: number;
}

export default function MoonshotTracker({
  onEmailStateChange,
}: {
  onEmailStateChange: (isSet: boolean) => void;
}) {
  const [userEmail, setUserEmail] = useState<string>("");
  const [isEmailSet, setIsEmailSet] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set()
  );
  const [totalHours, setTotalHours] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isLoadingFromStorage, setIsLoadingFromStorage] =
    useState<boolean>(true);
  const MAX_HOURS = 75;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  const START_DATE = "2025-10-10T00:00:00Z";

  const percentage = Math.min((totalHours / MAX_HOURS) * 100, 100);
  const moonshotComplete = totalHours >= MAX_HOURS;

    useEffect(() => {
    onEmailStateChange(isEmailSet);
  }, [isEmailSet, onEmailStateChange]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("hackatime-email");
    if (savedEmail) {
      setUserEmail(savedEmail);
      setIsEmailSet(true);
      fetchHackatimeData(savedEmail);
    }
    setIsLoadingFromStorage(false);
  }, []);

  const fetchHackatimeData = async (email?: string) => {
    const emailToUse = email || userEmail;
    if (!emailToUse) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchProjects(emailToUse, START_DATE);

      if (!data.data?.projects || !Array.isArray(data.data.projects)) {
        throw new Error("No projects found in API response");
      }

      const projectsList: Project[] = data.data.projects.map(
        (project: any) => ({
          name: project.name,
          hours: project.total_seconds / 3600,
        })
      );

      setProjects(projectsList);

      const allNames = new Set(projectsList.map((p) => p.name));
      setSelectedProjects(allNames);

      const selectedData = projectsList.filter((p) => allNames.has(p.name));

      const total = calculateTotalHours(selectedData);
      setTotalHours(total);
    } catch (err) {
      setError(
        "Failed to fetch HackaTime data. Please check your email and try again."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = () => {
    if (!userEmail) {
      setError("Please enter your email");
      return;
    }

    localStorage.setItem("hackatime-email", userEmail);
    setIsEmailSet(true);
    fetchHackatimeData(userEmail);
  };

  useEffect(() => {
    if (projects.length === 0 || selectedProjects.size === 0) {
      setTotalHours(0);
      return;
    }

    const selectedProjectsData = projects.filter((p) =>
      selectedProjects.has(p.name)
    );
    const total = calculateTotalHours(selectedProjectsData);
    setTotalHours(total);
  }, [selectedProjects, projects]);

  const toggleProject = (projectName: any) => {
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
    setTotalHours(0);
    setProjects([]);
    setSelectedProjects(new Set());
    setIsEmailSet(false);
    setUserEmail("");
    localStorage.removeItem("hackatime-email");
  };

  if (!isEmailSet) {
    return (
      <main className="flex items-center absolute top-100 font-(--font-kavoon) z-280">
        <div className="max-w-md w-full rounded-2xl border border-white/30 p-8 shadow-lg text-center bg-background/50 backdrop-blur-3xl">
          <h1 className="flex justify-center items-center gap-2 text-4xl mb-2 text-center">
            <Image
              src="/moonpheus-nosticker.webp"
              alt="Moon"
              width={40}
              height={40}
              className="h-auto z-0 opacity-90"
            />
            Tracker
          </h1>

          <p className="text-white/70 mb-6">
            Track your hackathon coding journey to 75 hours!
          </p>

          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/60 mb-4 focus:outline-none focus:ring-2 focus:ring-white/70"
          />

          {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

          <button
            onClick={handleEmailSubmit}
            disabled={loading || !userEmail}
            className="w-full font-kavoon uppercase tracking-wide text-white bg-black/70 hover:bg-black/80 transition px-6 py-3 rounded-lg border-2 border-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-2 ring-black/30"
          >
            {loading ? "Loading..." : "Start Tracking 🌕"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen p-6 absolute top-80 font-(--font-kavoon) text-center">
      <button
        onClick={() => fetchHackatimeData()}
        disabled={loading}
        className="fixed top-4 right-4 z-50 font-kavoon uppercase tracking-wide text-white bg-black/70 hover:bg-black/80 transition px-4 py-2 rounded-lg border-2 border-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-2 ring-black/30"
      >
        {loading ? "..." : "🔄 Refresh"}
      </button>
      <div className="max-w-5xl mx-auto">
        <div className="text-center text-4xl font-bold mb-8">
          {moonshotComplete
            ? "🌕 Mission Accomplished!"
            : `🚀 ${percentage.toFixed(1)}% of the way there!`}
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
                className="fill-none stroke-white/30"
                strokeDasharray="20 14"
                strokeLinecap="round"
                strokeWidth="8"
              />
              <g clipPath="url(#completedClip)">
                <use
                  href="#wavePath"
                  className="fill-none stroke-white"
                  strokeDasharray="20 14"
                  strokeLinecap="round"
                  strokeWidth="8"
                  style={{
                    filter: "drop-shadow(0 0 8px rgba(255,255,255,0.8))",
                  }}
                />
              </g>
              {/* castle and meeple img are from siege */}
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
          <div className="bg-white/10 border border-white/30 rounded-2xl backdrop-blur-md p-8 mb-6 shadow-lg">
            <h2 className="text-3xl mb-4">Select Projects</h2>
            <p className="text-center text-white/60 mb-4">
              Choose which projects to track (since Oct 1oth, 2025)
            </p>

            <div className="flex justify-center gap-3 mb-4">
              <button
                onClick={selectAllProjects}
                className="font-kavoon uppercase tracking-wide text-white bg-black/70 hover:bg-black/80 transition px-4 py-2 rounded-lg border-2 border-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-2 ring-black/30"
              >
                Select All
              </button>
              <button
                onClick={deselectAllProjects}
                className="font-kavoon uppercase tracking-wide text-white bg-black/70 hover:bg-black/80 transition px-4 py-2 rounded-lg border-2 border-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-2 ring-black/30"
              >
                Deselect All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
              {projects.map((project) => (
                <label
                  key={project.name}
                  className="flex items-center gap-2 p-3 border border-white/30 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedProjects.has(project.name)}
                    onChange={() => toggleProject(project.name)}
                    className="w-5 h-5 accent-white"
                  />

                  <span className="truncate">{project.name}</span>

                  <span className="text-sm text-white/70 ml-auto">
                    {formatHours(project.hours)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/10 border border-white/30 rounded-2xl backdrop-blur-md p-8 shadow-lg">
          <h2 className="text-3xl mb-6">Your Progress</h2>

          <div className="text-2xl mb-4">
            {totalHours === 0
              ? "You haven't started yet!"
              : `${formatHours(totalHours)} logged!`}
          </div>

          <div className="text-white/70 mb-6">
            {selectedProjects.size} project
            {selectedProjects.size !== 1 ? "s" : ""} selected
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={reset}
              className="font-kavoon uppercase tracking-wide text-white bg-black/70 hover:bg-black/80 transition px-6 py-2 rounded-lg border-2 border-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-2 ring-black/30"
            >
              🔒 Reset & Change Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
