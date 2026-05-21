// Send beautiful Erev Shabbat/Chag summary email
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('/home/node/.n8n/config.json', 'utf8'));
const shabbatData = $('Check Shabbat Entry').first().json;
const aiResult = $('AI Shabbat Steward').first().json;

const candleLighting = shabbatData.candleLighting 
  ? new Date(shabbatData.candleLighting).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })
  : 'לא זמין';

const holidayName = shabbatData.holidayName || 'שבת';
const isTransition = shabbatData.isTransitionCholToKodesh;
const actionsCount = (aiResult.schedule || []).length;
const reasoning = aiResult.reasoning_summary || '';

// Build schedule table rows
const scheduleRows = (aiResult.schedule || []).map(action => {
  const time = new Date(action.time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
  const icon = action.action === 'OFF' ? '🔴' : '🟢';
  return `<tr>
    <td style="padding: 8px; border-bottom: 1px solid #eee;">${icon} ${time}</td>
    <td style="padding: 8px; border-bottom: 1px solid #eee;">${action.entity}</td>
    <td style="padding: 8px; border-bottom: 1px solid #eee;">${action.explanation || ''}</td>
  </tr>`;
}).join('');

const htmlBody = `
<div style="direction: rtl; font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center;">
    <h1 style="margin: 0; font-size: 26px;">🕯️ ${holidayName} שלום!</h1>
    <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">הדלקת נרות: ${candleLighting}</p>
  </div>
  
  <div style="padding: 25px; color: #333;">
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 15px; font-weight: bold;">🤖 ניתוח AI:</p>
      <p style="margin: 8px 0 0; font-size: 14px; color: #555;">${reasoning}</p>
    </div>

    <p style="font-size: 15px; font-weight: bold; margin-bottom: 10px;">
      ${isTransition ? '🔄 מעבר חול → קודש' : '✡️ קודש → קודש (חג מחובר)'}
    </p>

    <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
      ${actionsCount} פעולות מתוזמנות לערב:
    </p>

    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="padding: 8px; text-align: right;">שעה</th>
          <th style="padding: 8px; text-align: right;">מכשיר</th>
          <th style="padding: 8px; text-align: right;">סיבה</th>
        </tr>
      </thead>
      <tbody>
        ${scheduleRows}
      </tbody>
    </table>
  </div>

  <div style="background: #f8f9fa; padding: 12px; text-align: center; font-size: 11px; color: #999;">
    AI Shabbat Steward | n8n Automation
  </div>
</div>
`;

return [{
  json: {
    to: config.settings.NOTIFICATION_EMAIL,
    subject: `🕯️ ${holidayName} - סיכום הכנות (${actionsCount} פעולות)`,
    html: htmlBody
  }
}];
