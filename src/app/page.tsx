import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (token) {
    const payload = await verifyJwt(token);
    if (payload?.role === "SYSTEM_ADMIN") {
      redirect("/admin");
    }
  }

  redirect("/dashboard");
}
