const mongoose = require("mongoose");

const payLaterSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "course",
    required: true,
  },
  
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tutor",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "person",  // note the change here to "person"
    required: true,
  },
  selectedDate: { type: String, required: true },
  selectedTime: { type: String, required: true },
  duration: { type: String, required: true },
  bonus: { type: String },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
}, { timestamps: true });

module.exports = mongoose.model("PayLater", payLaterSchema);
