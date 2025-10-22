"use client";

import { motion } from "motion/react";
import Image from "next/image";
import localFont from "next/font/local";
import MoonshotTracker from "@/components/page";
import { useState } from "react";

const kavoon = localFont({
  src: "../fonts/kavoon.woff2",
  variable: "--font-kavoon",
  display: "swap",
});

export default function MoonshotPage() {
  const [isEmailSet, setIsEmailSet] = useState(false);

  return (
    <main
      className={`${
        isEmailSet ? "h-[280svh]" : "h-svh"
      } overflow-hidden bg-[#130B2C] text-sand relative ${kavoon.variable}`}
      style={{ fontFamily: "var(--font-kavoon), cursive" }}
    >
      <div
        className="relative w-screen h-full flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: "url('/star-tile.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          backgroundColor: "#130B2C",
        }}
      >
        <img
          src="/off-to-moonshot-overlay.webp"
          alt="Off to Moonshot!"
          width={1200}
          height={400}
          className="pointer-events-none select-none absolute left-1/2 -translate-x-1/2 top-[80px] w-[80vw] max-w-[900px] h-auto z-50"
        />

        <motion.img
          src="/moonpheus-nosticker.webp"
          alt="Moon"
          width={400}
          height={400}
          className="pointer-events-none select-none absolute top-6 right-[12vw] w-[105px] md:w-[150px] xl:w-[220px] xl:right-[20vw] h-auto z-0 opacity-90"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 80, ease: "linear" }}
        />

        <Image
          src="/topright-cloud.webp"
          alt=""
          width={1200}
          height={800}
          className="pointer-events-none select-none absolute top-0 right-0 max-w-[75vw] md:max-w-[60vw] w-auto h-auto z-35 opacity-90"
        />
        <Image
          src="/bottom-clouds.webp"
          alt=""
          width={1600}
          height={800}
          className="pointer-events-none select-none absolute bottom-0 left-1/2 -translate-x-1/2 z-20 w-[220vw] md:w-[200vw] h-auto opacity-50"
        />
        <div className="pointer-events-none select-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[140vw] md:w-[120vw] max-w-[1400px] z-25">
          <Image
            src="/roller-coaster.webp"
            alt=""
            width={1600}
            height={800}
            className="w-full h-auto"
          />
        </div>
        <Image
          src="/more-bottom-clouds.webp"
          alt=""
          width={1600}
          height={800}
          className="pointer-events-none select-none absolute -bottom-6 left-1/2 -translate-x-1/2 z-30 w-[240vw] md:w-[220vw] h-auto opacity-50"
        />

        <motion.img
          src="/cat-stronaut.webp"
          alt="Cat-stronaut"
          width={200}
          height={200}
          className="pointer-events-none select-none absolute top-28 md:top-32 xl:top-48 left-6 w-[180px] md:w-[270px] xl:w-[360px] h-auto z-40"
          animate={{ y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        />

        <motion.img
          src="/orph.webp"
          alt="Orph astronaut"
          width={220}
          height={220}
          className="pointer-events-none select-none absolute bottom-[12vh] md:bottom-[14vh] xl:bottom-[22vh] right-6 w-[202px] md:w-[294px] xl:w-[360px] h-auto z-40"
          animate={{ y: [0, 20, 0] }}
          transition={{
            repeat: Infinity,
            duration: 6,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <MoonshotTracker onEmailStateChange={setIsEmailSet} />
      </div>
    </main>
  );
}
