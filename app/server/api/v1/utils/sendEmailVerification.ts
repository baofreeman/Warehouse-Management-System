import { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../prisma/prisma";
import { addMinutes } from "date-fns";
import { compileMjml } from "./compile-mjml";
import path from "path";
import { sendMail } from "./mailer";

export const sendEmailVerification = async (
  userEmail: string,
  userId: string,
  userName: string
) => {
  try {
    const token = crypto.randomBytes(32).toString("hex");

    await prisma.verificationToken.create({
      data: {
        token,
        userId: userId,
        type: "verify",
        expiresAt: addMinutes(new Date(), 15),
      },
    });

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const html = compileMjml(
      path.join(__dirname, "..", "templates", "verify-email.mjml"),
      { name: userName, verificationLink }
    );

    await sendMail({
      to: userEmail,
      subject: "Xác minh email - Freeman WMS",
      html,
    });
  } catch (error) {
    console.error("Error sending email verification:", error);
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });
    if (!record || record.type !== "verify") {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: "Token expired" });
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { isVerified: true },
    });
    await prisma.verificationToken.delete({ where: { token } });

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
