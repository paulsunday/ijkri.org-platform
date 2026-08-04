import QRCode from "qrcode";

import { requireActionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function GET() {
  const reviewer = await requireActionUser();

  const ambassador = await prisma.reviewerAmbassador.findUnique({
    where: { userId: reviewer.id },
    select: { referralCode: true },
  });

  if (!ambassador) {
    return Response.json({ error: "Ambassador profile not found." }, { status: 404 });
  }

  const referralLink = `${getAppUrl()}/author/submit?ref=${ambassador.referralCode}`;
  const qrBuffer = await QRCode.toBuffer(referralLink, { width: 600, margin: 1 });

  return new Response(new Uint8Array(qrBuffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": 'attachment; filename="referral-qr-code.png"',
    },
  });
}
