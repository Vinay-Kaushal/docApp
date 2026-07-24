import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { documentsRouter } from "./documents";
import { authRouter } from "./auth";
import { db } from "../db";

// Build a fresh app instance against the same (seeded) sqlite db that
// db/index.ts sets up. We don't mock the db - for something this small
// hitting real sqlite is fast and gives more confidence than a mock.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRouter);
  app.use("/api", documentsRouter);
  return app;
}

const app = buildApp();
const VINAY = "u_vinay";
const ASHA = "u_asha";
const MARCUS = "u_marcus";

describe("documents API", () => {
  let newDocId: string;

  it("creates a document owned by the requesting user", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("x-user-id", VINAY)
      .send({ title: "Test Plan", content: "<p>hello</p>" });

    expect(res.status).toBe(201);
    expect(res.body.document.title).toBe("Test Plan");
    expect(res.body.document.owner_id).toBe(VINAY);
    newDocId = res.body.document.id;
  });

  it("rejects requests with no auth header", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(401);
  });

  it("does not let a stranger read a private document", async () => {
    const res = await request(app).get(`/api/documents/${newDocId}`).set("x-user-id", MARCUS);
    expect(res.status).toBe(403);
  });

  it("lets the owner share the document with view access", async () => {
    const res = await request(app)
      .post(`/api/documents/${newDocId}/share`)
      .set("x-user-id", VINAY)
      .send({ userId: ASHA, permission: "view" });

    expect(res.status).toBe(201);
    expect(res.body.shared_with).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ASHA, permission: "view" })])
    );
  });

  it("lets the shared user read but not edit the document", async () => {
    const readRes = await request(app).get(`/api/documents/${newDocId}`).set("x-user-id", ASHA);
    expect(readRes.status).toBe(200);
    expect(readRes.body.document.permission).toBe("view");

    const editRes = await request(app)
      .patch(`/api/documents/${newDocId}`)
      .set("x-user-id", ASHA)
      .send({ content: "<p>sneaky edit</p>" });
    expect(editRes.status).toBe(403);
  });

  it("still blocks non-shared users after the share was granted to someone else", async () => {
    const res = await request(app).get(`/api/documents/${newDocId}`).set("x-user-id", MARCUS);
    expect(res.status).toBe(403);
  });

  it("only lets the owner delete the document", async () => {
    const deniedRes = await request(app).delete(`/api/documents/${newDocId}`).set("x-user-id", ASHA);
    expect(deniedRes.status).toBe(403);

    const okRes = await request(app).delete(`/api/documents/${newDocId}`).set("x-user-id", VINAY);
    expect(okRes.status).toBe(204);
  });
});
