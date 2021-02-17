const express = require('express');
const app = express();
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

const port = process.env.PORT || 3000
app.set('view engine', 'ejs');

// create a schedule routing at midnight
const rule = new schedule.RecurrenceRule();
rule.hour = 0;
rule.minute = 0;
rule.tz= 'Europe/Paris'


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
