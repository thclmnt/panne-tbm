const express = require('express');
const app = express();
const Twitter = require('twitter');
const fs = require('fs');
const schedule = require('node-schedule');
require('dotenv').config();

const port = 80
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

const DATA_FILE = 'data.json';

const GET_DATA = () => {
  let data = fs.readFileSync(DATA_FILE);
  return JSON.parse(data);
}

const SET_DATA = (obj) => {
  fs.writeFileSync(DATA_FILE,JSON.stringify(obj));
}

const UPDATE_DATA = () => {
  let data = GET_DATA();
  data.DAY=data.DAY +1
  data.YEAR=data.YEAR +1
  SET_DATA(data);
}

// reseting day variable every day
const job = schedule.scheduleJob(rule, function(){
  let data = GET_DATA();
  data.DAY=0;
  SET_DATA(data);
});


app.get('/', function(req, res) {
  let data = GET_DATA();
  res.render('pages/index',
  {
    day: data.DAY,
    year: data.YEAR,
  });
});

app.listen(process.env.PORT || port, () => {
  console.log(`Server is running on port: ${port}`)
})

// tracking new TBM tweet
client.stream('statuses/filter', {track: SEARCH_TRAM},  function(stream) {
  stream.on('data', function(tweet) {
    if(is_TBM(tweet.user.id)){
      UPDATE_DATA();
    }
    console.log("+1!")
  });

  stream.on('error', function(error) {
    console.log(error);
  });
});
