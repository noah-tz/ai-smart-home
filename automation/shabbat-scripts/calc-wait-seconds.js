// Calculate how many seconds to wait until this action's scheduled time
const action = $input.first().json;
const targetTime = new Date(action.time).getTime();
const now = Date.now();
const waitSeconds = Math.max(0, Math.floor((targetTime - now) / 1000));

return [{
  json: {
    ...action,
    waitSeconds
  }
}];
