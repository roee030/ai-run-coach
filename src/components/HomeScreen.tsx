/**
 * HomeScreen - Hero with centered large circular START button
 */

import { motion } from "framer-motion";
import { Button, Card, CardBody } from "@nextui-org/react";

interface HomeScreenProps {
  onStartRun: () => void;
}

export function HomeScreen({ onStartRun }: HomeScreenProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.6 } },
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: { duration: 2, repeat: Infinity },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="app-screen w-full bg-black flex items-start justify-center relative overflow-hidden"
    >
      {/* Background image + ambient glow */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-sm opacity-30"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1520975913222-2c09f9f5b6c5')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg mx-auto"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center gap-3 text-center mb-16"
        >
          <h1 className="text-5xl sm:text-7xl brand-title text-white leading-tight">
            Run Tracker
          </h1>
          <p className="text-lg brand-label mt-1">
            Your personal running companion
          </p>
        </motion.div>

        {/* Large Circular START Button */}
        <motion.div variants={itemVariants} className="mb-16">
          <motion.div variants={pulseVariants} animate="pulse">
            <Button
              isIconOnly
              onClick={onStartRun}
              className="brand-circle brand-btn h-40 w-40 sm:h-60 sm:w-60 text-4xl sm:text-5xl font-black"
              size="lg"
              aria-label="Start run"
            >
              ▶
            </Button>
          </motion.div>
          <div className="text-center mt-6">
            <p className="text-xl font-black text-white uppercase tracking-widest">
              Start
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">
              Begin Your Run
            </p>
          </div>
        </motion.div>

        {/* Stats Preview Cards */}
        <motion.div variants={itemVariants} className="w-full max-w-md">
          <div className="grid grid-cols-2 gap-3 w-full">
            <Card className="app-card">
              <CardBody className="p-4 text-center">
                <div className="brand-label">Distance</div>
                <div className="mt-2 text-4xl brand-title app-brand-text">
                  0.0
                </div>
                <div className="text-xs text-zinc-500">km</div>
              </CardBody>
            </Card>

            <Card className="app-card">
              <CardBody className="p-4 text-center">
                <div className="brand-label">Time</div>
                <div className="mt-2 text-4xl brand-title">00:00</div>
              </CardBody>
            </Card>
          </div>
          <div className="mt-3">
            <Card className="app-card">
              <CardBody className="p-4 text-center">
                <div className="brand-label">Pace</div>
                <div className="mt-2 text-3xl brand-title">—</div>
              </CardBody>
            </Card>
          </div>
        </motion.div>

        {/* Footer Text */}
        <motion.p
          variants={itemVariants}
          className="mt-16 text-xs text-gray-500 text-center max-w-xs uppercase tracking-wider"
        >
          Track distance, pace & speed with precision GPS
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
