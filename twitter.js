const Twit = require('twit');
const TramId = require('./models/const')
const Tram = require('./models/tram');
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL, {useNewUrlParser: true, useUnifiedTopology: true})
    .then((result) => {
        console.log("connected to db")
    })
    .catch((err) => console.log(err));


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

////////////////////////
// Twitter Stream

// returning tram from twitter id
function tramIdSolver(id) {
    if (id==TramId.A) { return 'A' };
    if (id==TramId.B) { return 'B' };
    if (id==TramId.C) { return 'C' };
    if (id==TramId.D) { return 'D' };
    return -1;
}

// search term on twitter
const SEARCH_TRAM = `"#TBMTram" AND ("interrompu" OR "interruptions")`;  
// logging to twitter API using key in .env file
let client = new Twit({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN_KEY,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

// stream API connection
let stream = client.stream('statuses/filter', { track: SEARCH_TRAM });

// create new tram report on tweet
stream.on('tweet', function (tweet) {
    let idTweet = tweet.user.id
    let idTram = tramIdSolver(idTweet);
    if (idTram != -1){
        CREATE_TRAM_REPORT(idTram);
    }
    console.log(tweet.user.id)
});

stream.on('error', function (error) {
    console.log(error);
})