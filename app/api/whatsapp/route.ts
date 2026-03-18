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
  return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 });
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
      await sendWhatsAppMessage(from, '👋 Hola! Soy *ControlBankDS*.\n\nEnvíame una *imagen* de tu comprobante de pago para analizarlo. 🔍');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    await sendWhatsAppMessage(from, '⏳ Recibí tu comprobante. Analizando... un momento.');

    const imageId = message.image.id;
    const imageUrl = await getWhatsAppMediaUrl(imageId);
    const imageBase64 = await downloadImageAsBase64(imageUrl);
    const voucherData = await extractVoucherDataWithGPT(imageBase64);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://v0-voucher-analysis.vercel.app';
    const analysisResponse = await fetch(`${baseUrl}/api/analyze-voucher`, {
      method: 'POST',
