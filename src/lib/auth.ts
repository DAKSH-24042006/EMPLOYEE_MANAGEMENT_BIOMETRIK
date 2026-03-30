import { SignJWT, jwtVerify } from "jose";

export const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // For local mocking/development (In prod, enforce throwing error)
    return new TextEncoder().encode("mocked_fallback_secret_key_for_development_purposes");
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
