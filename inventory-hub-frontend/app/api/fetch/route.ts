import { NextRequest, NextResponse } from 'next/server';

type FetchRequest = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

function parseFetchCall(input: string): FetchRequest {
  const urlMatch = input.match(/^fetch\(\s*["']([^"']+)["']\s*,/);
  if (!urlMatch) throw new Error('Invalid fetch call: could not find URL');

  const url = urlMatch[1];

  const optionsStart = input.indexOf('{');
  const optionsEnd = input.lastIndexOf('}');
  if (optionsStart === -1 || optionsEnd === -1) throw new Error('Invalid fetch call: could not find options object');

  const options = JSON.parse(input.slice(optionsStart, optionsEnd + 1)) as {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  };

  return { url, method: options.method ?? 'GET', headers: options.headers ?? {}, body: options.body };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { fetchCommand?: string } & Partial<FetchRequest>;

    let parsed: FetchRequest;
    const raw = payload.fetchCommand?.trim();

    if (raw) {
      parsed = parseFetchCall(raw);
    } else if (payload.url) {
      parsed = { url: payload.url, method: payload.method, headers: payload.headers, body: payload.body };
    } else {
      return NextResponse.json({ message: 'url is required' }, { status: 400 });
    }

    const response = await fetch(parsed.url, {
      method: parsed.method ?? 'GET',
      headers: parsed.headers,
      body: parsed.method === 'GET' ? undefined : parsed.body,
      redirect: 'follow',
    });

    const text = await response.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // Keep plain text if not JSON.
    }

    if (!response.ok) {
      return NextResponse.json(
        { message: `Upstream request failed with status ${response.status}`, status: response.status, response: data },
        { status: 502 }
      );
    }

    return NextResponse.json({ status: response.status, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message }, { status: 400 });
  }
}
