const express = require('express');
const app = express();
const Twitter = require('twitter');
const fs = require('fs');
const mongoose = require('mongoose');
const Tram = require('./models/tram');
const TramId = require('./models/const')
const cron = require('node-cron');
require('dotenv').config();

let startOfDay = require('date-fns/startOfDay')
let endOfDay = require('date-fns/endOfDay')

mongoose.connect(process.env.MONGO_URL, {useNewUrlParser: true, useUnifiedTopology: true})
    .then((result) => {
      console.log("connected to db")
      UPDATE_REDIS_CACHE_YEAR();
      UPDATE_REDIS_CACHE_DAY();
    })
    .catch((err) => console.log(err));

const redis = require("redis");
const DB = redis.createClient(process.env.REDIS_URL);

const { promisify } = require("util");
const getAsync = promisify(DB.get).bind(DB);

DB.on("error", function(error) {
  console.error(error);
});

function CREATE_TRAM_REPORT(tramName) {
  const tram = new Tram({
      tram: tramName,
  });

  tram.save()
      .then((result) =>{
          console.log(result);
      });
}


function UPDATE_REDIS_CACHE_DAY() {
  Tram.countDocuments({
      date: {
          $gte: startOfDay(new Date()),
          $lte: endOfDay(new Date())
      }
  }).then((result) => {
      DB.set("day",result);
  })
}

function UPDATE_REDIS_CACHE_YEAR() {
  Tram.countDocuments({
      date: {
          $gt: new Date('2021-01-01'),
      }
  }).then((result) => {
      DB.set("year",result);
  })
}

const port = process.env.PORT || 3000
app.set('view engine', 'ejs');

cron.schedule('*/2 * * * *', () => {
  console.log('updating cache...');
  UPDATE_REDIS_CACHE_DAY();
  UPDATE_REDIS_CACHE_YEAR();
});


// logging to twitter API using key in .env file
let client = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});


// TBM Tram account ID on twitter


// twitter search term
const SEARCH_TRAM = `"#TBMTram" AND "interrompu" -filter:replies`

// predicate to know if a twitter id is from a TBM account
let is_TBM = id => {
  return id==TramId.A
    || id==TramId.B
    || id==TramId.C
    || id==TramId.D
};

let tramGetId = id => {
  if (id==TramId.A) { return 'A' };
  if (id==TramId.B) { return 'B' };
  if (id==TramId.C) { return 'C' };
  if (id==TramId.D) { return 'D' };
}


function RENDER_RESULT(req, res,next){
  DB.mget(["day","year"],(err,data) => {
    if (err) throw err;
    if (data!==null){
      res.render('pages/index',{
        day: data[0],
        year: data[1],
      });
    }
  })
}


function RENDER_TWEET(req, res, next) {
  res.render('pages/tweets');
}

function ERROR(req, res, next){
  res.status(500).send("Erreur serveur!")
}

app.get('/', RENDER_RESULT, ERROR);

app.get('/tweets', RENDER_TWEET, ERROR);

app.listen(port, () => {
  console.log(`Server is running on port: http://localhost:${port}`)
})

// tracking new TBM tweet
client.stream('statuses/filter', {track: SEARCH_TRAM},  function(stream) {
  stream.on('data', function(tweet) {
    if(is_TBM(tweet.user.id)){
      let tramId = tramGetId(id);
      CREATE_TRAM_REPORT(tramId)
    }
  });

  stream.on('error', function(error) {
    console.log(error);
  });
});