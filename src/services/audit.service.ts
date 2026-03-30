export async function logDecision(entry) {
  console.log("AUDIT LOG:", JSON.stringify(entry, null, 2));
}
