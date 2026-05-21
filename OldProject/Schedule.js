// --- Solution to calculate Chatzot time and activate the trigger ---

/**
 * This function should run once a day (for example at 02:00 in the evening).
 * It deletes old triggers, checks when Chatzot time is, and creates a trigger for today.
 */
function scheduleTodayBlinds() {
    try {
        UtilsProject.AddLog("AiWeather", "start scheduleTodayBlinds");
        // 1. Delete old triggers to avoid duplicates
        deleteOldTriggers('dailyBlindsCheck');
        UtilsProject.AddLog("AiWeather", "deleted old triggers");

        // 2. Get Chatzot time from Hebcal API
        var chatzotTime = getChatzotTime();
        UtilsProject.AddLog("AiWeather", "got chatzot time: " + chatzotTime.toString());

        if (chatzotTime) {
            // 3. Create a new trigger for the exact time
            ScriptApp.newTrigger('dailyBlindsCheck')
                .timeBased()
                .at(chatzotTime)
                .create();

            UtilsProject.AddLog("AiWeather", "New trigger set for: " + chatzotTime.toString());
        } else {
            UtilsProject.AddLog("AiWeather", "Could not calculate Chatzot time. Setting default to 12:00.");
            // fallback: if the API fails, we'll set it to 12:00 in the afternoon
            var now = new Date();
            now.setHours(12, 0, 0, 0);
            ScriptApp.newTrigger('dailyBlindsCheck')
                .timeBased()
                .at(now)
                .create();
        }
    } catch (e) {
        UtilsProject.AddLog("AiWeather", "Error in scheduleTodayBlinds: " + e.toString());
    } finally { UtilsProject.Flush(); }
}

/**
 * Helper function to delete old triggers of the function.
 * @param {string} functionName - Name of the function to clear triggers for.
 */
function deleteOldTriggers(functionName) {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++)
        if (triggers[i].getHandlerFunction() === functionName)
            ScriptApp.deleteTrigger(triggers[i]);
    UtilsProject.AddLog("AiWeather", "deleted old triggers");
}

/**
 * Helper function to get Chatzot time.
 * @returns {Date|null} Date object for Chatzot time or null if failed.
 */
function getChatzotTime() {
    var today = new Date();
    var dateStr = Utilities.formatDate(today, "Asia/Jerusalem", "yyyy-MM-dd");

    // Call to Hebcal API with your coordinates
    var url = "https://www.hebcal.com/zmanim?cfg=json&latitude=" + LATITUDE + "&longitude=" + LONGITUDE + "&date=" + dateStr;

    try {
        /** @type {GoogleAppsScript.URL_Fetch.HTTPResponse} */
        var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        var data = JSON.parse(response.getContentText());

        if (data.times && data.times.chatzot)
        {
            // Hebcal returns time in ISO format, Google knows how to convert it to a Date object
            UtilsProject.AddLog("AiWeather", "got chatzot time: " + data.times.chatzot);
            return new Date(data.times.chatzot);
        }
    } catch (e) { UtilsProject.AddLog("AiWeather", "Error fetching Zmanim: " + e.toString()); }
    UtilsProject.AddLog("AiWeather", "Could not calculate Chatzot time.");
    return null;
}