import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PassportUser } from "../../../types/express";
import { Request } from "express";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  role: string;
}

const cookieExtractor = (req: Request): string | null => {
  const cookies = req.cookies as { [key: string]: string } | undefined;
  return cookies?.accessToken || null;
};

//  JwtStrategy
const jwtOpts = {
  jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
  secretOrKey: process.env.ACCESS_TOKEN_SECRET!,
};

passport.use(
  "jwt",
  new JwtStrategy(jwtOpts, async (jwtPayload: JwtPayload, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: jwtPayload.userId },
        include: { enterprise: true },
      });

      if (!user) {
        return done(null, false);
      }

      const passportUser: PassportUser = {
        id: user.id,
        userId: user.id,
        role: user.role,
        name: user.name,
        enterprise: user.enterprise?.name,
      };

      return done(null, passportUser);
    } catch (err) {
      return done(err, false);
    }
  })
);

// LocalStrategy
passport.use(
  "local",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email: string, password: string, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { email },
          include: { enterprise: true },
        });

        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const passportUser: PassportUser = {
          id: user.id,
          userId: user.id,
          role: user.role,
          name: user.name,
          enterprise: user.enterprise?.name,
        };

        return done(null, passportUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "http://localhost:4000/api/v1/auth/google/callback",
      passReqToCallback: true,
    },
    async (
      req: Request,
      accessToken: string,
      refreshToken: string,
      params: any,
      profile: any,
      done: (err: any, user?: any) => void
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;

        let enterpriseName: string | undefined;
        if (req.query.state) {
          const state = JSON.parse(
            Buffer.from(req.query.state as string, "base64").toString()
          );
          enterpriseName = state.enterpriseName;
        }

        let user = await prisma.user.findUnique({
          where: { email },
          include: { enterprise: true },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name,
              role: "STAFF",
              password: "",
              enterprise: {
                create: {
                  name: enterpriseName || "Default Enterprise",
                },
              },
            },
            include: { enterprise: true },
          });
        } else if (!user.enterpriseId && enterpriseName) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                enterprise: {
                  create: {
                    name: enterpriseName,
                  },
                },
              },
            });
          } catch (err) {
            return done(err);
          }
        }

        const passportUser: PassportUser = {
          id: user.id,
          userId: user.id,
          role: user.role,
          name: user.name,
          enterprise: user.enterprise?.name,
        };

        return done(null, passportUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      callbackURL: "http://localhost:4000/api/v1/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (err: any, user?: any) => void
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;

        let user = await prisma.user.findUnique({
          where: { email },
          include: { enterprise: true },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name,
              role: "STAFF",
              password: "",
              enterprise: {
                create: {
                  name: "Default Enterprise",
                },
              },
            },
            include: { enterprise: true },
          });
        }

        const passportUser: PassportUser = {
          id: user.id,

          userId: user.id,
          role: user.role,
          name: user.name,
          enterprise: user.enterprise?.name,
        };

        return done(null, passportUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);

export default passport;
