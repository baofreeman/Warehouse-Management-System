// [041025FREEMAN] Add file app.ts

import express from "express";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("API is working!");
});

export default app;
