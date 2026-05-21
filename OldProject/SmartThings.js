const SCENE_ID = scriptProperties.getProperty("SCENE_ID");


function closeLivingRoomBlinds() {
  var token = PropertiesService.getScriptProperties().getProperty('ST_TOKEN');
  var url = "https://api.smartthings.com/v1/scenes/" + SCENE_ID + "/execute";

  var options = {
    "method": "post",
    "headers": {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    "muteHttpExceptions": true
  };

  try {
    UtilsProject.AddLog("AiWeather", "Start closeLivingRoomBlinds (SmartThings)");
    var response = UrlFetchApp.fetch(url, options);
    UtilsProject.AddLog("AiWeather", "SmartThings Response: " + response.getContentText());

    if (response.getResponseCode() == 200) {
      UtilsProject.AddLog("AiWeather", "Blind closed successfully directly via Samsung!");
    } else {
      UtilsProject.AddLog("AiWeather", "Error from Samsung: " + response.getContentText());
    }
  } catch (e) {
    UtilsProject.AddLog("AiWeather", "Critical error: " + e.toString());
  }
}