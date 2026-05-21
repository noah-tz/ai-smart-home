// Split the AI schedule into individual items for sequential execution
// Each item will go through a Wait -> Execute loop
const schedule = $input.first().json.schedule || [];

// Sort by time
const sorted = schedule.sort((a, b) => new Date(a.time) - new Date(b.time));

// Return each action as a separate item
return sorted.map(action => ({ json: action }));
