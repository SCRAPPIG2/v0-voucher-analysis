import { NextRequest, NextResponse } from 'next/server';
import type { VoucherData } from '@/lib/types';
import { getClientByPhone } from '@/lib/db';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Verificacion fallida' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return NextResponse.json({ status: 'no message' }, { status: 200 });
    const from = message.from;
    const client = await getClientByPhone(from);
    const clientName = client?.name || null;
    if (message.type !== 'image') {
      const greeting = clientName ? `Hola ${clientName}! Soy ControlBankDS. Envíame una imagen de tu comprobante.` : 'Hola! Soy ControlBankDS. Envíame una imagen de tu comprobante.';
      await sendWhatsAppMessage(from, greeting);
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }
    await sendWhatsAppMessage(from, 'Recibí tu comprobante. Analizando...');
    const imageId = message.image.id;
    const imageUrl = await getWhatsAppMediaUrl(imageId);
    const imageBase64 = await downloadImageAsBase64(imageUrl);
    const voucherData = await extractVoucherDataWithGPT(imageBase64);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://v0-voucher-analysis.vercel.app';
    const analysisResponse = await fetch(`${baseUrl}/api/analyze-voucher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voucherData, whatsappNumber: from, clientName, imageBase64 }),
    });
    const analysisResult = await analysisResponse.json();
    const resultMessage = formatResultMessage(voucherData, analysisResult, clientName);
    await sendWhatsAppMessage(from, resultMessage);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

async function getWhatsAppMediaUrl(mediaId: string): Promise<string> {
  const response = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  });
  const data = await response.json();
  return data.url;
}

async function downloadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}

async function extractVoucherDataWithGPT(imageBase64: string): Promise<VoucherData> {
  const prompt = 'Analiza este comprobante bancario. Devuelve SOLO JSON: {"transaction_id":null,"reference_number":null,"bank_serial":null,"bank_origin":null,"bank_destination":null,"amount":null,"currency":"COP","issue_date":null,"beneficiary":null,"sender_name":null,"transfer_type":null,"payment_concept":null,"raw_text":""}';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1000,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }] }],
    }),
  });
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(content.replace(/```json|```/g, '').trim()) as VoucherData;
  } catch {
    return { transaction_id: null, reference_number: null, bank_serial: null, bank_origin: null, bank_destination: null, amount: null, currency: 'COP', issue_date: null, beneficiary: null, sender_name: null, transfer_type: null, payment_concept: null, raw_text: content };
  }
}

async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  });
}

function formatResultMessage(voucher: VoucherData, result: any, clientName: string | null): string {
  const { fraudAnalysis, forensicAnalysis } = result;
  const statusEmoji: Record<string, string> = { CLEAN: '✅', SUSPICIOUS: '⚠️', DUPLICATE: '🚨' };
  const statusLabel: Record<string, string> = { CLEAN: 'LEGITIMO', SUSPICIOUS: 'SOSPECHOSO', DUPLICATE: 'DUPLICADO' };
  const status = fraudAnalysis?.fraudStatus || 'CLEAN';
  const score = fraudAnalysis?.fraudScore ?? 0;
  const flags: string[] = fraudAnalysis?.fraudFlags || [];
  let msg = `🏦 *CONTROLBANKDS*\n\n${statusEmoji[status] || '✅'} *${statusLabel[status] || status}*\n📊 Riesgo duplicado: *${score}/100*\n`;
  if (forensicAnalysis) {
    const authScore = forensicAnalysis.authenticityScore ?? 100;
    const authEmoji = authScore >= 70 ? '✅' : authScore >= 40 ? '⚠️' : '🚨';
    msg += `${authEmoji} Autenticidad: *${authScore}/100*\n`;
  }
  if (clientName) msg += `👤 Cliente: *${clientName}*\n`;
  msg += `\n📋 *Datos:*\n`;
  if (voucher.bank_origin) msg += `• Banco origen: ${voucher.bank_origin}\n`;
  if (voucher.bank_destination) msg += `• Banco destino: ${voucher.bank_destination}\n`;
  if (voucher.amount) msg += `• Monto: ${voucher.currency} ${voucher.amount.toLocaleString()}\n`;
  if (voucher.issue_date) msg += `• Fecha: ${voucher.issue_date}\n`;
  if (voucher.sender_name) msg += `• Remitente: ${voucher.sender_name}\n`;
  if (voucher.beneficiary) msg += `• Beneficiario: ${voucher.beneficiary}\n`;
  if (voucher.reference_number) msg += `• Referencia: ${voucher.reference_number}\n`;
  if (flags.length > 0) {
    msg += `\n🚩 *Alertas de duplicado:*\n`;
    flags.forEach((f: string) => { msg += `• ${f}\n`; });
  }
  if (forensicAnalysis?.forensicFlags?.length > 0) {
    msg += `\n🔬 *Alertas forenses:*\n`;
    forensicAnalysis.forensicFlags.forEach((f: string) => { msg += `• ${f}\n`; });
  }
  msg += `\n_ControlBankDS_`;
  return msg;
}
