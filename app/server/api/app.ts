// [041025FREEMAN] Add file app.ts

import express, { Application } from "express";
import authRoutes from "./v1/routes/auth.routes";
import userRoutes from "./v1/routes/user.routes";
import cors from "cors";
import passport from "passport";
import cookieParser from "cookie-parser";

const app: Application = express();

app.use(express.json());
app.use(cors());
app.use(passport.initialize());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);

export default app;
