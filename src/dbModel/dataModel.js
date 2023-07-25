const mongoose = require('mongoose');
const { Schema } = mongoose;

const valueSchema = new Schema({
  device_type: { type: String, required: true },
  unit: { type: String, required: true },
});

const dataSchema = new Schema({
  device_id: { type: String, required: true },
  values: [valueSchema],
});

const DataModel = mongoose.model('Data', dataSchema);

module.exports = DataModel;
