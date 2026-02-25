import { ensureEnv, isAiEnabled } from '@/lib/env';

async function callOpenAi(messages: Array<{ role: 'system' | 'user'; content: string }>) {
  const env = ensureEnv();
  if (!isAiEnabled() || !env.OPENAI_API_KEY) return null;

  const model = env.OPENAI_MODEL || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages,
    }),
  });

  if (!response.ok) return null;
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() || null;
}

export async function generateAdmissionSummary(input: {
  studentName: string;
  university: string;
  course: string;
  source: string;
  amountReceived: number;
  universityFee: number;
  agentCommissionAmount: number;
  totalExpenses: number;
  netProfit: number;
}) {
  const fallback = [
    `Admission Summary for ${input.studentName}`,
    `University/Course: ${input.university} - ${input.course}`,
    `Source: ${input.source}`,
    `Received: INR ${input.amountReceived}`,
    `University Fee: INR ${input.universityFee}`,
    `Agent Commission: INR ${input.agentCommissionAmount}`,
    `Total Expenses: INR ${input.totalExpenses}`,
    `Final Net Profit: INR ${input.netProfit}`,
  ].join('\n');

  const ai = await callOpenAi([
    {
      role: 'system',
      content:
        'You are a concise counselor assistant. Produce a short, structured admission summary for internal CRM notes.',
    },
    {
      role: 'user',
      content: `Create a 6-8 bullet summary from this JSON:\n${JSON.stringify(input)}`,
    },
  ]);

  return ai || fallback;
}

export async function generatePendingPaymentMessage(input: {
  consultantName: string;
  rows: Array<{ studentName: string; university: string; pending: number; type: string }>;
}) {
  const fallbackLines = [
    `Hello, this is ${input.consultantName}.`,
    'Pending payment reminders:',
    ...input.rows.map(
      (row, index) =>
        `${index + 1}. ${row.studentName} - ${row.university} (${row.type}) pending INR ${row.pending}`
    ),
    'Please clear pending amounts at the earliest. Thank you.',
  ];

  const ai = await callOpenAi([
    {
      role: 'system',
      content:
        'Write clear professional WhatsApp reminders for pending payments. Keep it polite and brief.',
    },
    {
      role: 'user',
      content: JSON.stringify(input),
    },
  ]);

  return ai || fallbackLines.join('\n');
}

export async function generatePosterCaption(topic: string) {
  const fallback = `Admissions open now for ${topic}. Limited seats available. DM or call now to apply.`;
  const ai = await callOpenAi([
    {
      role: 'system',
      content:
        'Write a short WhatsApp-ready marketing caption with 3 hashtags, suitable for education admission campaigns.',
    },
    {
      role: 'user',
      content: topic,
    },
  ]);
  return ai || fallback;
}
