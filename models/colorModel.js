const mongoose = require('mongoose');

const ColorModel = new mongoose.Schema({
    Color: { type: String, required: true },
});

const ColorsData = mongoose.model('ColorsData', ColorModel);

module.exports = ColorsData;