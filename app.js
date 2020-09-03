const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

var app = express();

const bodyParser = require('body-parser');
const shortenerRouter = express.Router();

const Schema = mongoose.Schema;
require('mongoose-currency').loadType(mongoose);

const shortUrlSchema = new Schema({
  longUrl: String,
  shortUrl: {type: String, unique: true}
})

var ShortUrls = mongoose.model('ShortUrls', shortUrlSchema);

var shortUrlCounter = 4

app.use(cookieParser('12345-67890-09876-54321'));

function auth (req, res, next) {
  if (!req.signedCookies.user) {
    var authHeader = req.headers.authorization;
    if (!authHeader) {
        var err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        next(err);
        return;
    }
    var auth = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    var user = auth[0];
    var pass = auth[1];
    if (user == 'admin' && pass == 'password') {
        res.cookie('user','admin',{signed: true});
        next(); // authorized
    } else {
        var err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        next(err);
    }
  }
  else {
      if (req.signedCookies.user === 'admin') {
          next();
      }
      else {
          var err = new Error('You are not authenticated!');
          err.status = 401;
          next(err);
      }
  }
}
app.use(auth)

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const url = 'mongodb://localhost:27017/UrlShortener';

mongoose.connect(url, {useNewUrlParser: true})
.then(()=>console.log("Connected correctly to server"))
.catch(error => handleError(error))
mongoose.connection.on('error', err => {
  console.eror(err);
});


app.get('/deleteall', (req, res, next) => {
    ShortUrls.deleteMany({}, function (err) {
      if (err) console.error(err); else console.log("deleted all");
  })
  res.send("deleted all")
})

app.get('/', (req, res, next) => {
  console.log("app.get /: ")
  res.send("homepage be here")
})

app.post('/api/postlongurl',  (req, res, next) => {
  ShortUrls.create({longUrl: req.body.longUrl, shortUrl: shortUrlCounter++}, (err, shortUrl) => {
      if (err) console.error(err);
      else {
          // No error, so we respond with the saved data,
          res.send(shortUrl);
      }
  })
});

app.get('/api/getlongurl/:shortUrl', (req, res, next) => {
    ShortUrls.find({shortUrl: req.params.shortUrl}, (err, data)=>{
      if (err) console.error(err);
      else {
        console.log("long url: " + data[0].longUrl)
        res.send(data[0].longUrl)
      }
    })
})


const PORT = 8080;

app.listen(PORT)
  .on('listening', () => {
    console.clear();
    console.log('server listening on port:', PORT);
  })
  .on('error', (err) => {
    console.error('### error opening port:', PORT);
    console.error(err);
  });
