import { Request, Response, NextFunction } from "express";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../utils/token";
import passport from "../services/passport";
import { PassportUser } from "../../../types/express";
import { addDays } from "date-fns";
import { sendEmailVerification } from "../utils/sendEmailVerification";
import { setAuthCookies } from "../utils/cookies";

const prisma = new PrismaClient();

class AuthController {
  async registerEnterprise(req: Request, res: Response): Promise<void> {
    const { enterpriseName, email, password, name } = req.body;

    try {
      const exist = await prisma.user.findUnique({ where: { email } });
      if (exist) {
        res.status(400).json({ message: "Email already exists" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const enterprise = await prisma.enterprise.create({
        data: {
          name: enterpriseName,
          users: {
            create: {
              name,
              email,
              password: hashedPassword,
              role: Role.STAFF,
            },
          },
        },
        include: {
          users: true,
        },
      });

      const user = enterprise.users[0];

      const accessToken = generateAccessToken({
        userId: user.id,
        role: user.role,
      });
      const refreshToken = await generateRefreshToken({
        userId: user.id,
        role: user.role,
      });

      sendEmailVerification(user.email, user.id, user.name);

      setAuthCookies(res, { accessToken, refreshToken });
      res.status(201).json({
        message: "User created successfully",
        user,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    const { token } = req.params;

    try {
      const record = await prisma.verificationToken.findUnique({
        where: { token },
      });
      if (!record || record.type !== "verify") {
        res.status(400).json({ message: "Invalid or expired token" });
        return;
      }
      if (record.expiresAt < new Date()) {
        res.status(400).json({ message: "Token expired" });
        return;
      }

      await prisma.user.update({
        where: { id: record.userId },
        data: { isVerified: true },
      });
      await prisma.verificationToken.delete({ where: { token } });

      res.json({ message: "Email verified successfully" });
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }

  login(req: Request, res: Response, next: NextFunction) {
    passport.authenticate(
      "local",
      { session: false },
      (err: any, user: PassportUser, info: { message: string }) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials" });
        }

        req.login(user, { session: false }, async (err) => {
          if (err) {
            return next(err);
          }

          const accessToken = generateAccessToken({
            userId: user.userId,
            role: user.role,
          });
          const refreshToken = await generateRefreshToken({
            userId: user.userId,
            role: user.role,
          });

          setAuthCookies(res, { accessToken, refreshToken });
          res.status(201).json({
            message: "Login successfully",
            user,
          });
        });
      }
    )(req, res, next);
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const token = req.cookies.refreshToken;
    if (!token) {
      res.status(401).json({ message: "Refresh token not found" });
      return;
    }

    try {
      const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as {
        userId: string;
        role: Role;
      };

      const saved = await prisma.refreshToken.findUnique({ where: { token } });
      if (!saved || saved.expiresAt < new Date()) {
        res.status(403).json({ message: "Refresh token expired or invalid" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        res.status(403).json({ message: "User not found" });
        return;
      }

      const newAccessToken = generateAccessToken({
        userId: user.id,
        role: user.role,
      });
      const newRefreshToken = await generateRefreshToken({
        userId: user.id,
        role: user.role,
      });

      if (!newAccessToken || !newRefreshToken) {
        throw new Error("Failed to generate tokens");
      }

      setAuthCookies(res, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
      res.status(201).json({
        message: "Refresh token successfully",
      });
    } catch (error) {
      res.status(403).json({ message: "Invalid refresh token" });
      return;
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    const token = req.cookies.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out" });
  }

  googleLogin(req: Request, res: Response, next: NextFunction): void {
    const { enterpriseName } = req.query;
    passport.authenticate("google", {
      scope: ["profile", "email"],
      state: enterpriseName
        ? Buffer.from(JSON.stringify({ enterpriseName })).toString("base64")
        : undefined,
    })(req, res, next);
  }

  googleCallback(req: Request, res: Response, next: NextFunction) {
    passport.authenticate(
      "google",
      { failureRedirect: "/login" },
      (err: Error | null, user: PassportUser | false) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: "Authentication failed" });
        }

        req.login(user, { session: false }, async (err) => {
          if (err) {
            return next(err);
          }

          const accessToken = generateAccessToken({
            userId: user.userId,
            role: user.role,
          });
          const refreshToken = await generateRefreshToken({
            userId: user.userId,
            role: user.role,
          });

          if (user.isVerified === false) {
            await prisma.user.update({
              where: { id: user.userId },
              data: {
                isVerified: true,
              },
            });
          }

          setAuthCookies(res, { accessToken, refreshToken });
          res.status(201).json({
            message: "Login google successfully",
            user: {
              id: user.userId,
              name: user.name,
              role: user.role,
              enterprise: user.enterprise,
            },
          });
        });
      }
    )(req, res, next);
  }

  facebookLogin(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate("facebook", { scope: ["email", "public_profile"] })(
      req,
      res,
      next
    );
  }

  facebookCallback(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate(
      "facebook",
      { failureRedirect: "/login" },
      (err: Error | null, user: PassportUser | false) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: "Authentication failed" });
        }

        req.login(user, { session: false }, (err) => {
          if (err) {
            return next(err);
          }

          const accessToken = generateAccessToken({
            userId: user.userId,
            role: user.role,
          });
          const refreshToken = generateRefreshToken({
            userId: user.userId,
            role: user.role,
          });

          res.status(200).json({
            accessToken,
            refreshToken,
            user: {
              id: user.userId,
              name: user.name,
              role: user.role,
              enterprise: user.enterprise,
            },
          });
        });
      }
    )(req, res, next);
  }
}

export default new AuthController();
