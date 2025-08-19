import mongoose, { Schema, Document } from "mongoose";

export interface NoteDoc extends Document {
  title: string;
  body: string;
  releaseAt: Date;
  webhookUrl: string;
  status: "pending" | "delivered" | "failed" | "dead";
  attempts: { at: Date; statusCode: number; ok: boolean; error?: string }[];
  deliveredAt?: Date | null;
}

const NoteSchema = new Schema<NoteDoc>({
  title: { type: String, required: true },
  body: { type: String, required: true },
  releaseAt: { type: Date, required: true },
  webhookUrl: { type: String, required: true },
  status: { type: String, enum: ["pending", "delivered", "failed", "dead"], default: "pending" },
  attempts: [{ at: Date, statusCode: Number, ok: Boolean, error: String }],
  deliveredAt: { type: Date, default: null },
});

// Indexes
NoteSchema.index({ releaseAt: 1 });
NoteSchema.index({ status: 1 });

export default mongoose.model<NoteDoc>("Note", NoteSchema);
