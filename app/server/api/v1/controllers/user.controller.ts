import { Request, Response } from "express";
import prisma from "../prisma/prisma";

class UserController {
  async getUsers(req: Request, res: Response) {
    const { user } = req;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const users = await prisma.user.findMany({
      where: { enterpriseId: user?.userId ? user.enterpriseId : undefined },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    res.status(200).json(users);
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(user);
  }

  async updateUserDetails(req: Request, res: Response) {
    const { name } = req.body;
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: { name },
    });
    res.json(user);
  }

  async deleteUser(req: Request, res: Response) {
    const { id } = req.params;
    const user = await prisma.user.delete({
      where: { id },
    });
    res.json(user);
  }
}

export default new UserController();
