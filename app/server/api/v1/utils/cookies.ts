import { Response } from "express";

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  maxAge: number;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const setAuthCookies = (res: Response, tokens: AuthTokens): void => {
  const accessTokenOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 1,
  };

  const refreshTokenOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  };

  res.cookie("accessToken", tokens.accessToken, accessTokenOptions);
  res.cookie("refreshToken", tokens.refreshToken, refreshTokenOptions);
};
