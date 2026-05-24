// Send Yom Kodesh (Shabbat Day) summary email
const config = $('Load Config').first().json;
const kodeshData = $('Check Yom Kodesh').first().json;
const aiResult = $('AI Yom Kodesh Steward').first().json;

const havdalah = kodeshData.havdalahToday
  ? new Date(kodeshData.havdalahToday).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })
  : null;

const actionsCount = (aiResult.schedule || []).length;
const reasoning = aiResult.reasoning_summary || '';
const transitionToChol = kodeshData.transitionToChol;

const scheduleRows = (aiResult.schedule || []).map(action => {
  const time = new Date(action.time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
  const icon = action.action === 'OFF' ? '🔴' : '🟢';
  return `<tr>
    <td style="padding: 8px; border-bottom: 1px solid #eee;">${icon} ${time}</td>
    <td style="padding: 8px; border-bottom: 1px solid #eee;">${action.entity}</td>
    <td style="padding: 8px; border-bottom: 1px solid #eee;">${action.explanation || ''}</td>
  </tr>`;
}).join('');

const headerColor = transitionToChol ? '#2d3436' : '#6c5ce7';
const statusText = transitionToChol 
  ? `שבת שלום! הבדלה: ${havdalah}` 
  : 'שבת שלום! הקודש ממשיך מחר';

const htmlBody = `
<div style="direction: rtl; font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
  <div style="background: linear-gradient(135deg, ${headerColor} 0%, #0984e3 100%); color: white; padding: 25px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">✡️ ${statusText}</h1>
  </div>
  
  <div style="padding: 25px; color: #333;">
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 15px; font-weight: bold;">🤖 תוכנית היום:</p>
      <p style="margin: 8px 0 0; font-size: 14px; color: #555;">${reasoning}</p>
    </div>

    ${transitionToChol ? '<p style="font-size: 14px; color: #27ae60; font-weight: bold;">🔄 מעבר קודש → חול הערב — מיני בר יודלק בהבדלה</p>' : '<p style="font-size: 14px; color: #8e44ad; font-weight: bold;">✡️ הקודש ממשיך — אין שינוי במיני בר</p>'}

    <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
      ${actionsCount} פעולות מתוזמנות להיום:
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
    AI Shabbat Day Manager | n8n Automation
  </div>
</div>
`;

return [{
  json: {
    to: config.settings.NOTIFICATION_EMAIL,
    subject: `✡️ שבת שלום - תוכנית היום (${actionsCount} פעולות)`,
    html: htmlBody
  }
}];
