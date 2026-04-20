export function appendStateHistory(record, from, to, actor = "system") {
  const history = record.encounter_data?.history || [];

  const newEntry = {
    from,
    to,
    actor,
    timestamp: new Date().toISOString()
  };

  return {
    ...record.encounter_data,
    history: [...history, newEntry]
  };
}
