const CRISIS_REPLY =
  "If you feel in immediate danger, please contact emergency services or someone you trust right now.";

const GENERIC_REPLIES = [
  "I hear you. Take a slow breath with me — in for four, hold, out for six. You are safe in this moment.",
  "Thank you for sharing that. There is no rush. What feels most true in your body right now?",
  "That sounds heavy. You do not have to carry it alone here. What would feel like one small kindness toward yourself?",
  "I am with you. Let us soften the edges: name one thing you can see, hear, or feel that is neutral or gentle.",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function getMockReply(userText: string): string {
  const t = userText.toLowerCase();

  if (
    t.includes("crisis") ||
    t.includes("crisis help") ||
    t.includes("emergency") ||
    t.includes("hurt myself")
  ) {
    return CRISIS_REPLY;
  }

  if (t.includes("anxious") || t.includes("anxiety")) {
    return "Anxiety often tightens the chest and thoughts. Try grounding: press your feet into the floor and name three soft sounds around you. I am right here.";
  }
  if (t.includes("stress") || t.includes("stressed")) {
    return "Stress can feel like a full room. We can make it smaller: one minute of slower breathing, shoulders dropping on each exhale. What is one thing you could set down for now?";
  }
  if (t.includes("down") || t.includes("sad") || t.includes("low")) {
    return "Feeling down is a signal, not a verdict. You still deserve warmth. Is there a small rest, tea, or stretch that might meet you where you are?";
  }
  if (t.includes("overwhelm")) {
    return "When everything feels loud, we go tiny: the next sip of water, the next breath, the next step. Which single next thing feels possible?";
  }
  if (t.includes("uncertain") || t.includes("unsure") || t.includes("decide")) {
    return "Uncertainty is uncomfortable but it is also open space. What values matter most to you in this choice — peace, honesty, safety, growth? We can hold them gently together.";
  }
  if (t.includes("okay") || t.includes("ok ") || t === "ok") {
    return "I am glad you are here. Even on okay days, checking in is a quiet kind of care. What would make this moment a little softer?";
  }
  if (t.includes("journal")) {
    return "Journaling can be a doorway. Try: ‘Today I felt… because… and what I need is…’ Write without editing — this space is yours.";
  }
  if (t.includes("check-in") || t.includes("check in")) {
    return "Daily check-in: mood 1–10, one word for your body, one hope for tomorrow. There is no wrong answer — only honesty, gently held.";
  }
  if (t.includes("calm")) {
    return "Let us slow the tempo. Inhale through the nose for four, exhale through the mouth for six. Imagine warm light around your shoulders. Repeat as long as you like.";
  }
  if (t.includes("talk")) {
    return "I am listening. Say whatever is on your mind — messy, small, or heavy. This is a judgment-free pause.";
  }

  return pick(GENERIC_REPLIES);
}
