import mongoose from 'mongoose';

const AttemptSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    statusCode: { type: Number, required: true },
    ok: { type: Boolean, required: true },
    error: { type: String },
  },
  { _id: false }
);

const NoteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    releaseAt: { type: Date, required: true },
    webhookUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'delivered', 'failed', 'dead'],
      default: 'pending',
      index: true,
    },
    attempts: { type: [AttemptSchema], default: [] },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NoteSchema.index({ releaseAt: 1 });
NoteSchema.index({ status: 1 });

export const Note = mongoose.model('Note', NoteSchema);


