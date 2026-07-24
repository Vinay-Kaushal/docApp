import express from "express";
import cors from "cors";
import "./db"; // runs migrations + seed on import
import { authRouter } from "./routes/auth";
import { documentsRouter } from "./routes/documents";
import { uploadRouter } from "./routes/upload";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api", authRouter);
app.use("/api", documentsRouter);
app.use("/api", uploadRouter);

// last-resort error handler so a thrown error returns JSON, not an HTML stack trace
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end." });
});

app.listen(PORT, () => {
  console.log(`docapp server listening on http://localhost:${PORT}`);
});
