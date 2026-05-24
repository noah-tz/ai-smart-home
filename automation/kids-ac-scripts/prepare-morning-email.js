// Morning summary email for kids AC
const config = $('Load Config').first().json;
const result = $input.first().json;

const htmlBody = '<div style="direction:rtl;font-family:Segoe UI,sans-serif;max-width:500px;margin:auto;border:1px solid #eee;border-radius:10px;overflow:hidden">' +
  '<div style="background:linear-gradient(135deg,#2d3436,#636e72);color:white;padding:20px;text-align:center"><h2 style="margin:0">🌙 סיכום לילה — חדר ילדים</h2></div>' +
  '<div style="padding:20px;color:#333"><p>פעולה אחרונה: <strong>' + (result.action || 'N/A') + '</strong></p>' +
  '<p>טמפרטורה חיצונית: ' + (result.outdoorTemp || 'N/A') + '°C</p>' +
  '<p>סיבה: ' + (result.reason || 'לא התקבל הסבר') + '</p></div>' +
  '<div style="background:#f5f5f5;padding:10px;text-align:center;font-size:11px;color:#999">AI Kids Sleep Guardian</div></div>';

return [{ json: { to: config.settings.NOTIFICATION_EMAIL, subject: '🌙 סיכום לילה — חדר ילדים', html: htmlBody } }];
