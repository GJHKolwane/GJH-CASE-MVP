/*
================================================
TIMELINE EVENT LOGGER
================================================
Adds immutable events to the encounter history
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
