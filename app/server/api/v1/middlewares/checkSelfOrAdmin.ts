import { Request, Response, NextFunction } from "express";
import prisma from "../prisma/prisma";

export const checkSelfOrAdmin = () => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: id },
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (req.user.role === "ADMIN" || req.user.userId === id) {
        return next();
      }

      res.status(403).json({ message: "Forbidden - Access denied" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};
