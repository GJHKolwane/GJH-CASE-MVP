/*
================================================
TIMELINE EVENT LOGGER
================================================
*/

export function addTimelineEvent(encounter, eventType, payload = {}) {

  if (!encounter.timeline) {
    encounter.timeline = [];
  }

  const event = {

    type: eventType,

    timestamp: new Date().toISOString(),

    payload

  };

  encounter.timeline.push(event);

  return encounter;

}
