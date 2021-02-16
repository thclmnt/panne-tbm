const express = require('express');
const app = express();
const Twitter = require('twitter');
const fs = require('fs');
const schedule = require('node-schedule');
require('dotenv').config();

const redis = require("redis");
const DB = redis.createClient(process.env.REDIS_URL);

const { promisify } = require("util");
const getAsync = promisify(DB.get).bind(DB);

DB.on("error", function(error) {
  console.error(error);
});

function CHANGE_DATA(day,year) {
  DB.set("day",day);
  DB.set("year",year);
}

function UPDATE_ONE_DATA() {
  DB.incr("day");
  DB.incr("year");
}

function UPDATE_MIDNIGHT_DATA() {
  DB.set("day",0);
}

const port = process.env.PORT || 80
app.set('view engine', 'ejs');

// create a schedule routing at midnight
const rule = new schedule.RecurrenceRule();
rule.hour = 0;
rule.minute = 0;
rule.tz= 'Europe/Paris'

// logging to twitter API using key in .env file
let client = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});


// TBM Tram account ID on twitter
const ID_TBM_TramA = 822960991;
const ID_TBM_TramB = 822958014;
const ID_TBM_TramC = 822984878;
const ID_TBM_TramD = 2938368987;

// twitter search term
const SEARCH_TRAM = `"#TBMTram" AND "interrompu" -filter:replies`

// predicate to know if a twitter id is from a TBM account
let is_TBM = id => {
  return id==ID_TBM_TramA
    || id==ID_TBM_TramB
    || id==ID_TBM_TramC
    || id==ID_TBM_TramD
};

const job = schedule.scheduleJob(rule, function(){
  UPDATE_MIDNIGHT_DATA();
});


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

app.get('/', RENDER_RESULT);

app.listen(port, () => {
  console.log(`Server is running on port: http://localhost:${port}`)
})

// tracking new TBM tweet
client.stream('statuses/filter', {track: SEARCH_TRAM},  function(stream) {
  stream.on('data', function(tweet) {
    if(is_TBM(tweet.user.id)){
      UPDATE_ONE_DATA()
    }
    console.log("+1!")
  });

  stream.on('error', function(error) {
    console.log(error);
  });
});
