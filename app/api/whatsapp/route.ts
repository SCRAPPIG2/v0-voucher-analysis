import { NextRequest, NextResponse } from 'next/server';
import type { VoucherData } from '@/lib/types';

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
    if (message.type !== 'image') {
      await sendWhatsAppMessage(from, 'Hola! Soy ControlBankDS. Envíame una imagen de tu comprobante de pago para analizarlo.');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }
    await sendWhatsAppMessage(from, 'Recibí tu comprobante. Analizando... un momento.');
    const imageId = message.image.id;
    const imageUrl = await getWhatsAppMediaUrl(imageId);
    const imageBase64 = await downloadImageAsBase64(imageUrl);
    const voucherData = await extractVoucherDataWithGPT(imageBase64);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://v0-voucher-analysis.vercel.app';
    const analysisResponse = await fetch(`${baseUrl}/api/analyze-voucher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voucherData }),
    });
    const analysisResult = await analysisResponse.json();
    const resultMessage = formatResultMessage(voucherData, analysisResult);
    await sendWhatsAppMessage(from, resultMessage);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Error en webhook WhatsApp:', error);
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
  const prompt = `Analiza este comprobante de pago bancario y extrae los datos en formato JSON. Devuelve SOLO el JSON sin texto adicional con esta estructura: {"transaction_id": "string o null", "reference_number": "string o null", "bank_serial": "string o null", "bank_origin": "string o null", "bank_destination": "string o null", "amount": numero o null, "currency": "COP", "issue_date": "YYYY-MM-DD o null", "beneficiary": "string o null", "sender_name": "string o null", "transfer_type": "string o null", "payment_concept": "string o null", "raw_text": "todo el texto visible"}`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1000,
      messages: [{ role: 'user', content: [
        { type: 'text', text: pr
