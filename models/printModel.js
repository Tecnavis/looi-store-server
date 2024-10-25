
const mongoose = require('mongoose');

const PrintSchema = new mongoose.Schema({
    image: { 
        type: String,  
        required: true  
    }
}, {
  timestamps: { createdAt: true, updatedAt: false }  
});

const PrintModel = mongoose.model('prints', PrintSchema);

module.exports = PrintModel;