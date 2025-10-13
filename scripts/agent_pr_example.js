const https = require('https');

const { GH_REPO, GH_TOKEN, TASK_ID } = process.env;
if (!GH_REPO || !GH_TOKEN || !TASK_ID) {
  console.error('Set GH_REPO, GH_TOKEN, TASK_ID');
  process.exit(1);
}

const data = JSON.stringify({
  title: `Agent PR: ${TASK_ID} → testing`,
  head: `agent/${TASK_ID}-demo`,
  base: 'testing',
  body: `Automated PR for task ${TASK_ID}.`
});

const opts = {
  hostname: 'api.github.com',
  path: `/repos/${GH_REPO}/pulls`,
  method: 'POST',
  headers: {
    'User-Agent': 'vibeflow-bot',
    'Authorization': `token ${GH_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(opts, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(body));
});
req.on('error', console.error);
req.write(data);
req.end();
