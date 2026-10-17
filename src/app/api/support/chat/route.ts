import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_SERVICE_MESSAGE,
  CUSTOMER_SERVICE_PHONE,
  buildSystemPrompt,
  checkRateLimit,
  getCustomerOrderContext,
  getDeliveryPartnerContext,
  queryGemini,
  shouldEscalate
} from "@/lib/support-ai";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required to access Snapcart AI Support" },
        { status: 401 }
      );
    }

    const { message, history } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { message: "Message text is required" },
        { status: 400 }
      );
    }

    const cleanMessage = message.trim();
    if (cleanMessage.length > 500) {
      return NextResponse.json(
        { message: "Message is too long. Please limit your question to 500 characters." },
        { status: 400 }
      );
    }

    // Rate limiting (15 requests per minute per user)
    const rateCheck = checkRateLimit(`support_${session.user.id}`, 15, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          reply: `You have sent several messages in a short period. ${CUSTOMER_SERVICE_MESSAGE}`,
          escalate: true,
          phone: CUSTOMER_SERVICE_PHONE
        },
        { status: 429 }
      );
    }

    const role = session.user.role || "user";
    const userName = session.user.name || "Snapcart User";
    const wantsHuman = shouldEscalate(cleanMessage);

    // Fetch live scoped context from database
    let liveContext = "No contextual data available.";
    if (role === "deliveryBoy") {
      liveContext = await getDeliveryPartnerContext(session.user.id);
    } else {
      liveContext = await getCustomerOrderContext(session.user.id);
    }

    // Immediate human escalation shortcut if requested
    if (wantsHuman) {
      return NextResponse.json({
        reply: `I understand you would like direct human support. ${CUSTOMER_SERVICE_MESSAGE}`,
        escalate: true,
        phone: CUSTOMER_SERVICE_PHONE
      });
    }

    // Check if Gemini is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        reply: `Our automated AI assistant is currently updating. ${CUSTOMER_SERVICE_MESSAGE}`,
        escalate: true,
        phone: CUSTOMER_SERVICE_PHONE
      });
    }

    // Query Gemini
    const systemPrompt = buildSystemPrompt(role, userName, liveContext);
    const validHistory = Array.isArray(history)
      ? history.filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.text === "string")
      : [];

    try {
      const aiReply = await queryGemini(systemPrompt, cleanMessage, validHistory);
      const isEscalationIncluded = aiReply.includes(CUSTOMER_SERVICE_PHONE);

      return NextResponse.json({
        reply: aiReply,
        escalate: isEscalationIncluded,
        phone: isEscalationIncluded ? CUSTOMER_SERVICE_PHONE : undefined
      });
    } catch (aiError: any) {
      console.error("[SUPPORT-AI] Provider error:", aiError.message);
      return NextResponse.json({
        reply: `I apologize, but I am having trouble connecting to our assistant right now. ${CUSTOMER_SERVICE_MESSAGE}`,
        escalate: true,
        phone: CUSTOMER_SERVICE_PHONE
      });
    }
  } catch (error: any) {
    console.error("[SUPPORT-AI] Unexpected server error:", error);
    return NextResponse.json(
      {
        reply: `An unexpected issue occurred. ${CUSTOMER_SERVICE_MESSAGE}`,
        escalate: true,
        phone: CUSTOMER_SERVICE_PHONE
      },
      { status: 500 }
    );
  }
}
