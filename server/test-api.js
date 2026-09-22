const http = require('http');

const testRateLimiting = async () => {
  const options = {
    hostname: '127.0.0.1',
    port: 5005,
    path: '/api/health',
    method: 'GET',
  };

  const makeRequest = () => {
    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', () => resolve(0));
      req.end();
    });
  };

  let requests = [];
  for (let i = 1; i <= 105; i++) {
    requests.push(makeRequest());
  }

  const results = await Promise.all(requests);
  const tooManyReqs = results.filter(code => code === 429).length;
  console.log(`[Rate Limit Test] Total Requests: 105, Status 429 (Too Many Requests) count: ${tooManyReqs}`);
};

testRateLimiting();
