import { Request, Response, NextFunction } from "express";
import passport from "../services/passport";
import { PassportUser } from "../../../types/express";

export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    "jwt",
    { session: false },
    (
      err: Error | null,
      user: PassportUser | false,
      info: { message?: string }
    ) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res
          .status(401)
          .json({ message: "Unauthorized - Invalid or expired token" });
      }
      req.user = user;
      next();
    }
  )(req, res, next);
};
