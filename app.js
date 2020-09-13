const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
var session = require('express-session');
var FileStore = require('session-file-store')(session);


var app = express();

const bodyParser = require('body-parser');
const shortenerRouter = express.Router();

const Schema = mongoose.Schema;
require('mongoose-currency').loadType(mongoose);

const shortUrlSchema = new Schema({
  longUrl: String,
  shortUrl: {type: String, unique: true},
  author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }
})

var ShortUrls = mongoose.model('ShortUrls', shortUrlSchema);

var shortUrlCounter = 7

var passport = require('passport');
var authenticate = require('./authenticate');
var userRouter = require('./routes/user')

app.use(cookieParser('12345-67890-09876-54321'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(passport.initialize());

app.use('/user', userRouter)

// Secure traffic only
app.all('*', (req, res, next) => {
  if (req.secure) {
    return next();
  }
  else {
    res.redirect(307, 'https://' + req.hostname + ':' + app.get('secPort') + req.url);
  }
});

const uploadRouter = require('./routes/upload');
app.use('/imageUpload',uploadRouter);

app.get('/deleteall', authenticate.verifyUser, (req, res, next) => {
    ShortUrls.deleteMany({}, function (err) {
      if (err) console.error(err); else console.log("deleted all");
  })
  res.send("deleted all")
})

app.get('/displayalluserlinks', authenticate.verifyUser, (req, res, next) => {
    ShortUrls.find({})
    .populate()
})

app.get('/', authenticate.verifyUser, (req, res, next) => {
  console.log("app.get /: ")
  var token = authenticate.getToken({_id: req.user._id});
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.send("homepage be here")
})

app.post('/api/postlongurl', authenticate.verifyUser, (req, res, next) => {
  ShortUrls.create({longUrl: req.body.longUrl, shortUrl: shortUrlCounter++, author: req.user._id})
  .then((shortUrl) => {
    ShortUrls.findById(shortUrl._id)
    .populate('author')
    .then((shortUrl) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(shortUrl);
                }, (err) => next(err))
      }, (err) => next(err))
});

app.get('/api/getlongurl/:shortUrl', authenticate.verifyUser, (req, res, next) => {
    ShortUrls.find({shortUrl: req.params.shortUrl}, (err, data)=>{
      if (err || !data) {console.error(err); res.send("error")}
      else {
        console.log(req.user._id + ' vs. ' + data.author)
        if (req.user._id === data.author)
          res.send(data[0].longUrl)
        else {
          res.send("not belonging to this user")
        }
      }
    })
})

app.use(express.static(path.join(__dirname, 'public')));


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


var config = require('./config');
const url = config.mongoUrl;

mongoose.connect(url, {useNewUrlParser: true})
.then(()=>console.log("Connected correctly to server"))
.catch(error => handleError(error))
mongoose.connection.on('error', err => {
  console.error(err);
});


const PORT = 8080;

var https = require('https');
var fs = require('fs');

app.set('secPort',PORT+443);
/**
 * Create HTTPS server.
 */
var options = {
  key: fs.readFileSync(__dirname+'/bin/private.key'),
  cert: fs.readFileSync(__dirname+'/bin/certificate.pem')
};
var secureServer = https.createServer(options,app);
/**
 * Listen on provided port, on all network interfaces.
 */
secureServer.listen(app.get('secPort'), () => {
   console.log('Server listening on port ',app.get('secPort'));
});
secureServer.on('error', (onError)=>console.error(onError));
secureServer.on('listening', (onListening)=>console.log(onListening));


app.listen(PORT)
  .on('listening', () => {
    console.clear();
    console.log('server listening on port:', PORT);
  })
  .on('error', (err) => {
    console.error('### error opening port:', PORT);
    console.error(err);
  });
