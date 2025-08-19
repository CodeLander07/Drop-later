import { Router } from "express";
import Note from "../models/Note";
import { z } from "zod";

const router = Router();

const NoteSchema = z.object({
  title: z.string(),
  body: z.string(),
  releaseAt: z.string().datetime(),
  webhookUrl: z.string().url(),
});

// POST /api/notes
router.post("/", async (req, res) => {
  try {
    const parsed = NoteSchema.parse(req.body);
    const note = await Note.create({
      ...parsed,
      releaseAt: new Date(parsed.releaseAt),
      status: "pending",
    });
    res.json({ id: note._id });
  } catch (err: any) {
    res.status(400).json({ error: "Invalid input", details: err.errors });
  }
});

// GET /api/notes?status=&page=
router.get("/", async (req, res) => {
  const { status, page = 1 } = req.query;
  const query: any = {};
  if (status) query.status = status;

  const notes = await Note.find(query)
    .skip((+page - 1) * 20)
    .limit(20)
    .sort({ releaseAt: 1 });

  res.json(notes);
});

// POST /api/notes/:id/replay
router.post("/:id/replay", async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });

  if (["failed", "dead"].includes(note.status)) {
    note.status = "pending";
    await note.save();
    return res.json({ message: "Note requeued" });
  }
  res.status(400).json({ error: "Note is not failed/dead" });
});

export default router;
