const express = require('express');
const app = express();
const fs = require('fs');
const mongoose = require('mongoose');
const Tram = require('./models/tram');
const cron = require('node-cron');
require('dotenv').config();
let startOfDay = require('date-fns/startOfDay')
let endOfDay = require('date-fns/endOfDay')

////////////////////////
// Database & Cache connection

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

////////////////////////
// Database function

// default tram report
function CREATE_TRAM_REPORT(tramName) {
  const tram = new Tram({
      tram: tramName,
  });
  tram.save()
      .then((result) =>{
          console.log("new tram report:")
          console.log(result);
      });
}

// function to update redis cache
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

// update redis every two minute
cron.schedule('*/2 * * * *', () => {
  UPDATE_REDIS_CACHE_DAY();
  UPDATE_REDIS_CACHE_YEAR();
});

////////////////////////
// Express Web App

//configuration
const port = process.env.PORT || 3000
app.set('view engine', 'ejs');

// render main page with data from cache
function RENDER_RESULT(req, res,next){
  DB.mget(["day","year"],(err,data) => {
    if (err) throw err;
    if (data!==null){
      res.render('pages/index',{
        day: data[0],
        year: data[1],
      });
    } else {
      next();
    }
  })
}

// render tweet page
function RENDER_TWEET(req, res, next) {
  res.render('pages/tweets');
}

// render error
function ERROR(req, res, next){
  res.status(500).send("Erreur serveur!")
}

// routing
app.get('/', RENDER_RESULT, ERROR);

app.get('/tweets', RENDER_TWEET, ERROR);

app.listen(port, () => {
  console.log(`Server is running on port: http://localhost:${port}`)
})