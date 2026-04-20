import { STATE_FLOW } from "./stateMap.js";

// 🚫 Blocks invalid transitions
export function assertValidTransition(current, next) {
  const allowed = STATE_FLOW[current] || [];

  if (!allowed.includes(next)) {
    throw new Error(
      `❌ Invalid state transition: ${current} → ${next}`
    );
  }
}
