import { SignJWT, jwtVerify } from "jose";

export const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }
  return new TextEncoder().encode(secret);
};

export async function signJwt(payload: { userId: string; role: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getJwtSecretKey());
  
  return token;
}

export async function verifyJwt(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as { userId: string; role: string; exp: number };
  } catch (error) {
    return null;
  }
}
