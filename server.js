var url     = require('url'),
    http    = require('http'),
    https   = require('https'),
    fs      = require('fs'),
    qs      = require('querystring'),
    express = require('express'),
    _       = require('lodash'),
    app     = express();

function loadApplicationVariables() {
  var fileName = __dirname + "/application.json";

  try {
    if (fs.statSync(fileName).isFile()) {
      var app_variables = JSON.parse(fs.readFileSync(fileName, 'utf8'));

      _.forEach(app_variables, function(value, key) {
        process.env[key] = value;
      });
    }
  }
  catch (e) {
    console.log("Failed to load application.json");
  }
}

// Load config defaults from JSON file.
// Environment variables override defaults.
function loadConfig() {
  loadApplicationVariables();

  var config = JSON.parse(fs.readFileSync(__dirname+ '/config.json', 'utf-8'));
  for (var i in config) {
    config[i] = process.env[i.toUpperCase()] || config[i];
  }
  console.log('Configuration');
  console.log(config);
  return config;
}

var config = loadConfig();

function authenticate(code, cb) {
  var data = qs.stringify({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: 'http://localhost:3000/auth/callback'
  });

  var encoded_id_and_secret = new Buffer(
    config.oauth_client_id +
    ":" +
    config.oauth_client_secret).toString("base64");

  var reqOptions = {
    host: config.oauth_host,
    port: config.oauth_port,
    path: config.oauth_path,
    method: config.oauth_method,
    headers: {
      "Authorization": "Basic " + encoded_id_and_secret
    }
  };

  var body = "";
  var req = http.request(reqOptions, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) { body += chunk; });
    res.on('end', function() {
      cb(null, JSON.parse(body).access_token);
    });
  });

  req.write(data);
  req.end();
  req.on('error', function(e) { cb(e.message); });
}


// Convenience for allowing CORS on routes - GET only
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS'); 
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});


app.get('/authenticate/:code', function(req, res) {
  console.log('authenticating code:' + req.params.code);
  authenticate(req.params.code, function(err, token) {
    var result = err || !token ? {"error": "bad_code"} : { "token": token };
    console.log(result);
    res.json(result);
  });
});

var port = process.env.PORT || config.port || 9999;

app.listen(port, null, function (err) {
  console.log('Gatekeeper, at your service: http://localhost:' + port);
});
