/**
 * Time formatting utilities
 */

/**
 * Format seconds to MM:SS display
 * @param totalSeconds - Total seconds elapsed
 * @returns Formatted string (e.g., "5:30")
 */
export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format hours, minutes, seconds from total seconds
 * @param totalSeconds - Total seconds elapsed
 * @returns Object with hours, minutes, seconds
 */
export function parseTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds };
}
