// Load project configuration from file
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('/home/node/.n8n/config.json', 'utf8'));
return [{ json: config }];
