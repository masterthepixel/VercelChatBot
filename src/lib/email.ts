import emailjs from "@emailjs/browser";

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

interface IntakeData {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicleInfo?: string;
  serviceDescription?: string;
  transcript: TranscriptMessage[];
  conversationId: string;
}

export async function sendTranscriptEmail(data: IntakeData): Promise<boolean> {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!;

  const transcriptText = data.transcript
    .map((msg) => `${msg.role === "user" ? "Customer" : "AI Agent"}: ${msg.content}`)
    .join("\n\n");

  const templateParams = {
    to_email: "cndautoservice@gmail.com",
    customer_name: data.customerName || "Not provided",
    customer_phone: data.customerPhone || "Not provided",
    customer_email: data.customerEmail || "Not provided",
    vehicle_info: data.vehicleInfo || "Not provided",
    service_description: data.serviceDescription || "See transcript",
    transcript: transcriptText,
    conversation_id: data.conversationId,
    date: new Date().toLocaleString(),
    subject: `New Service Request: ${data.customerName || "Unknown"} - ${data.vehicleInfo || "Vehicle TBD"}`,
  };

  try {
    await emailjs.send(serviceId, templateId, templateParams, publicKey);
    return true;
  } catch (error) {
    console.error("EmailJS send failed:", error);
    return false;
  }
}
