"use client";
import { useState, useEffect, useRef } from "react";

export default function SiegeTracker() {
  const [hoursWorked, setHoursWorked] = useState(0);
  const [minutesWorked, setMinutesWorked] = useState(0);
  const MAX_HOURS = 75;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  const totalWorked = hoursWorked + minutesWorked / 60;
  const percentage = Math.min((totalWorked / MAX_HOURS) * 100, 100);
  const siegeComplete = totalWorked >= MAX_HOURS;

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

  const addTime = () => {
    let totalMinutes = hoursWorked * 60 + minutesWorked + 15; // add 15 min
    setHoursWorked(Math.floor(totalMinutes / 60));
    setMinutesWorked(totalMinutes % 60);
  };

  const reset = () => {
    setHoursWorked(0);
    setMinutesWorked(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center text-4xl text-amber-800 mb-6">
          {siegeComplete
            ? "🏰 You've conquered the castle!"
            : `⚔️ ${percentage.toFixed(1)}% of the way there!`}
        </div>

        <div className="relative w-full flex justify-center">
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
        <div className="mt-10 bg-white/80 backdrop-blur border-2 border-amber-200 rounded-2xl shadow-xl p-8">
          <h2
            className="text-3xl font-bold text-amber-900 text-center mb-6"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Add Time
          </h2>

          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <label className="block text-amber-700 mb-2 font-medium">
                Hours
              </label>
              <input
                type="number"
                min="0"
                max={MAX_HOURS}
                value={hoursWorked}
                onChange={(e) => setHoursWorked(Number(e.target.value))}
                className="w-24 text-center text-3xl font-bold border-2 border-amber-300 rounded-lg p-2 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="text-center">
              <label className="block text-amber-700 mb-2 font-medium">
                Minutes
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutesWorked}
                onChange={(e) => setMinutesWorked(Number(e.target.value))}
                className="w-24 text-center text-3xl font-bold border-2 border-amber-300 rounded-lg p-2 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={addTime}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-md transition-transform hover:scale-110 active:scale-95"
            >
              +15 min
            </button>
            <button
              onClick={reset}
              className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition-transform hover:scale-110 active:scale-95"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="text-center mt-8 text-2xl text-amber-900">
          {totalWorked === 0
            ? "You haven't started yet!"
            : `${hoursWorked}h ${minutesWorked}m logged!`}
        </div>
      </div>
    </div>
  );
}
