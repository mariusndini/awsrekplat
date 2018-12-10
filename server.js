const http = require('http');
const https = require('https');
const app = require('./app.js');
const fs = require("fs");


const port = 20000;


//const server = http.createServer(app);
//const server = https.createServer(options, app).listen(port);
const httpserver = http.createServer(app).listen(port);


console.log('SERVER START -p: ' + port );
//server.listen(port);


