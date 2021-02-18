const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tramSchema = new Schema({
    tram: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    }
});

const Tram = mongoose.model('Tram',tramSchema);

module.exports = Tram;