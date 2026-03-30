export async function logDecision(entry: any) {
  console.log("AUDIT LOG:", JSON.stringify(entry, null, 2));
}
