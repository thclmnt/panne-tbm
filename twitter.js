const needle = require('needle');
const TramId = require('./models/const')
const Tram = require('./models/tram');
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL, {useNewUrlParser: true, useUnifiedTopology: true})
    .then((result) => {
        console.log("connected to db")
    })
    .catch((err) => console.log(err));

const token = process.env.BEARER_TOKEN;
const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream';


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
// FUNCTION FROM: https://github.com/twitterdev/Twitter-API-v2-sample-code/blob/master/Filtered-Stream/filtered_stream.js

const rules = [{
    'value': '("interruptions" OR "interrompu") from:TBM_TramA',
    'tag': 'A'
},
{
    'value': '("interruptions" OR "interrompu") from:TBM_TramB',
    'tag': 'B'
},
{
    'value': '("interruptions" OR "interrompu") from:TBM_TramC',
    'tag': 'C'
},
{
    'value': '("interruptions" OR "interrompu") from:TBM_TramD',
    'tag': 'D'
},
];

async function getAllRules() {
    const response = await needle('get', rulesURL, {
        headers: {
            "authorization": `Bearer ${token}`
        }
    })
    if (response.statusCode !== 200) {
        throw new Error(response.body);
    }
    return (response.body);
}

async function deleteAllRules(rules) {
    if (!Array.isArray(rules.data)) {
        return null;
    }
    const ids = rules.data.map(rule => rule.id);
    const data = {
        "delete": {
            "ids": ids
        }
    }
    const response = await needle('post', rulesURL, data, {
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`
        }
    })
    if (response.statusCode !== 200) {
        throw new Error(response.body);
    }
    return (response.body);
}


async function setRules() {
    const data = {
        "add": rules
    }
    const response = await needle('post', rulesURL, data, {
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`
        }
    })
    if (response.statusCode !== 201) {
        throw new Error(response.body);
    }
    return (response.body);
}


function streamConnect() {
    const stream = needle.get(streamURL, {
        headers: {
            "User-Agent": "v2FilterStreamJS",
            "Authorization": `Bearer ${token}`
        },
        timeout: 20000
    });
    stream.on('data', data => {
        try {
            const json = JSON.parse(data);
            let tram = json['matching_rules'][0].tag;
            CREATE_TRAM_REPORT(tram);
        } catch (e) {
        }
    }).on('error', error => {
        if (error.code === 'ETIMEDOUT') {
            stream.emit('timeout');
        }
    });
    return stream;
}


(async () => {
    let currentRules;
    try {
        currentRules = await getAllRules();
        await deleteAllRules(currentRules);
        await setRules();
    } catch (e) {
        console.error(e);
        process.exit(-1);
    }
    const filteredStream = streamConnect();
    let timeout = 0;
    filteredStream.on('timeout', () => {
        console.warn('A connection error occurred. Reconnecting…');
        setTimeout(() => {
            timeout++;
            streamConnect();
        }, 2 ** timeout);
        streamConnect();
    })

})();