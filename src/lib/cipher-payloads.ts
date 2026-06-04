export type DemoKey = "phishing" | "scam_call" | "multimodal";

export const DEMO_PAYLOADS: Record<DemoKey, { label: string; emoji: string; text: string }> = {
  phishing: {
    label: "Phishing Email",
    emoji: "📧",
    text: `[INCOMING EMAIL]
From: support@amaz0n-delivery-help.example
Subject: Your package is held — $1.99 fee required
Body: Your parcel is on hold. Pay the $1.99 redelivery fee within 12 hours or it returns to sender. Confirm your card here: hxxps://amaz0n-redeliver.example/pay

Please analyze this suspicious email and protect me.`,
  },
  scam_call: {
    label: "Scam Call",
    emoji: "📞",
    text: `[INCOMING CALL — transcript]
"This is the Social Security Administration. Your number has been suspended due to suspicious activity. To avoid arrest, purchase $500 in gift cards and read me the codes to verify your identity."

Please analyze this call and protect me.`,
  },
  multimodal: {
    label: "Multimodal Attack",
    emoji: "🎭",
    text: `[COORDINATED ATTACK]
1) Voice call from "Mom's number" (spoofed caller ID), AI-cloned voice: "Honey, I'm stuck and lost my phone, I'm texting from a friend's. Can you send $800?"
2) Follow-up SMS from an unknown number: "It's me, send via this link: hxxps://quick-send.example/m"

Please analyze this coordinated attack and protect me.`,
  },
};