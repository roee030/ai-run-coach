/**
 * RunControls component - Large interactive start/stop/reset buttons
 */

import { motion } from "framer-motion";
import { Button, Card, CardBody, Alert } from "@nextui-org/react";

interface RunControlsProps {
  isRunning: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export function RunControls({
  isRunning,
  error,
  onStart,
  onStop,
  onReset,
}: RunControlsProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="px-4 py-6 w-full max-w-md mx-auto"
    >
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4"
        >
          <Alert
            color="danger"
            title="Error"
            description={error}
            className="bg-red-500/10"
          />
        </motion.div>
      )}

      {/* Controls - Large Buttons */}
      <div className="flex gap-3 items-center justify-center">
        {!isRunning ? (
          <motion.div className="w-full flex justify-center">
            <Button
              onClick={onStart}
              size="lg"
              className="brand-circle brand-btn h-28 w-28 sm:h-32 sm:w-32 text-2xl font-black"
              aria-label="Start run"
            >
              ▶
            </Button>
          </motion.div>
        ) : (
          <>
            <motion.div className="flex gap-4 items-center">
              <Button
                onClick={onStop}
                size="lg"
                className="brand-circle h-20 w-20 text-lg font-black"
                aria-label="Pause run"
              >
                ⏸
              </Button>

              <Button
                onClick={onReset}
                size="lg"
                className="brand-circle bg-red-600 text-white h-20 w-20 text-lg font-black"
                aria-label="Stop run"
              >
                ■
              </Button>
            </motion.div>
          </>
        )}
      </div>

      {/* Safety Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center"
      >
        <Card className="bg-neutral-900 border border-neutral-800">
          <CardBody className="p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              Keep screen on • Grant location access
            </p>
          </CardBody>
        </Card>
      </motion.div>
    </motion.div>
  );
}
