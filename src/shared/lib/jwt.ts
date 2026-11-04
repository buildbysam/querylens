import { config } from "@/config.js";
import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();
const accessSecret = encoder.encode(config.getOrThrow("JWT_ACCESS_SECRET") as string);
const refreshSecret = encoder.encode(config.getOrThrow("JWT_REFRESH_SECRET") as string);

export async function createAccessToken(userId: string, sessionId: string) {
  return new SignJWT({
    sessionId,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("myapp")
    .setAudience("myapp")
    .sign(accessSecret);
}

export async function createRefreshToken(userId: string, sessionId: string) {
  return new SignJWT({
    sessionId,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("myapp")
    .setAudience("myapp")
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string) {
  const result = await jwtVerify(token, accessSecret, {
    issuer: "myapp",
    audience: "myapp",
    algorithms: ["HS256"],
  });

  if (result.payload.type !== "access") {
    throw new Error("Invalid token type");
  }

  return result.payload;
}

export async function verifyRefreshToken(token: string) {
  const result = await jwtVerify(token, refreshSecret, {
    issuer: "myapp",
    audience: "myapp",
    algorithms: ["HS256"],
  });

  if (result.payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  return result.payload;
}
