export function resolveVisibility(careMode) {
  if (careMode === "telemedicine") {
    return ["doctor", "nurse"];
  }

  return ["doctor"];
}
