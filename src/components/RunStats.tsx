/**
 * RunStats component - displays running metrics with premium athletic styling
 */

import { motion } from "framer-motion";
import { Card, CardBody, Progress } from "@nextui-org/react";
import {
  formatDistance,
  formatPace,
  speedMpsToKmh,
} from "../utils/geolocation";
import { formatTime } from "../utils/formatting";

interface RunStatsProps {
  elapsedTime: number;
  distance: number;
  currentSpeed: number;
  pace: number;
  isRunning: boolean;
  gpsAcquired: boolean;
  coachMessageType?: string | null;
  coachIsSpeaking?: boolean;
  coachDeviation?: number;
}

export function RunStats({
  elapsedTime,
  distance,
  currentSpeed,
  pace,
  isRunning,
  gpsAcquired,
  coachMessageType,
  coachIsSpeaking,
  coachDeviation,
}: RunStatsProps) {
  const speedKmh = speedMpsToKmh(currentSpeed);
  const dev = coachDeviation ?? 0;
  const absDev = Math.min(1, Math.abs(dev));
  // map absDev [0..1+] to pulse duration between 2s (normal) and 0.6s (fast)
  const pulseDuration = Math.max(0.6, 2 - absDev * 1.4);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col items-center justify-start px-4 py-6 w-full"
    >
      {/* Coach Card is handled at parent level; Timer top section */}
      <motion.div variants={itemVariants} className="w-full mb-6">
        <div className="text-center">
          <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">
            TIME
          </div>
          <div className="mt-3 text-8xl font-black text-white font-mono tabular-nums leading-none">
            {formatTime(elapsedTime)}
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="w-full max-w-4xl">
        <div className="grid grid-cols-2 gap-4">
          <Card isHoverable className="border border-white/10 bg-neutral-900">
            <CardBody className="p-4 text-center">
              <div className="text-xs text-gray-400 uppercase">Distance</div>
              <div className="mt-2 text-4xl font-black text-[#1ED760]">
                {formatDistance(distance)}
              </div>
              <div className="text-xs text-gray-500">km</div>
            </CardBody>
          </Card>

          {/* Pace card: pulse when coach issues slow/speed warnings */}
          <Card
            isHoverable
            className={`border border-white/10 bg-neutral-900 ${
              coachMessageType === "slow"
                ? "animate-pulse shadow-[0_0_28px_rgba(255,99,71,0.35)] ring-2 ring-orange-400/40"
                : coachMessageType === "speed"
                  ? "animate-pulse shadow-[0_0_28px_rgba(250,204,21,0.35)] ring-2 ring-yellow-400/40"
                  : ""
            }`}
            style={
              coachMessageType
                ? { animationDuration: `${pulseDuration}s` }
                : undefined
            }
          >
            <CardBody className="p-4 text-center">
              <div className="text-xs text-gray-400 uppercase">Pace</div>
              <div className="mt-2 text-4xl font-black text-white">
                {formatPace(pace)}
              </div>
              <div className="text-xs text-gray-500">min/km</div>
            </CardBody>
          </Card>

          <Card isHoverable className="border border-white/10 bg-neutral-900">
            <CardBody className="p-4 text-center">
              <div className="text-xs text-gray-400 uppercase">
                Current Speed
              </div>
              <div className="mt-2 text-4xl font-black text-white">
                {speedKmh.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">km/h</div>
            </CardBody>
          </Card>

          <Card isHoverable className="border border-white/10 bg-neutral-900">
            <CardBody className="p-4 text-center">
              <div className="text-xs text-gray-400 uppercase">Calories</div>
              <div className="mt-2 text-4xl font-black text-white">—</div>
              <div className="text-xs text-gray-500">kcal</div>
            </CardBody>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
