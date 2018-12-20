var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var uuid = require('uuid/v4')
var session = require('express-session')
var expressValidator = require('express-validator');


var app = express();
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressValidator())

app.use(session({
  genid: (req) => {
    return uuid() // use UUIDs for session IDs
  },
  secret: 'P@$$w0rdKeySecr3t',
  resave: false,
  saveUninitialized: true
}))



app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var rekRoutes = require('./routes/awsrek');
app.use('/rek', rekRoutes);

var routes = require('./routes/users');
app.use('/', routes);

//var accounts = require('./routes/accounts');
//app.use('/accounts', accounts)

//delete later
var P = require('./imgPromise.js');
P.img();





module.exports = app;

