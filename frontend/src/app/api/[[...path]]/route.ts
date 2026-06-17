import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return handle(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return handle(req, await params);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return handle(req, await params);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return handle(req, await params);
}

async function handle(req: NextRequest, params: { path?: string[] }) {
  const pathParts = params.path || [];
  const targetPath = pathParts.join("/");
  
  // Extract query parameters
  const { search } = new URL(req.url);
  
  const prefix = targetPath.startsWith("v1") ? "api" : "api/v1";
  const backendUrl = `http://127.0.0.1:8000/${prefix}/${targetPath}${search}`;
  
  // Forward headers (except host)
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });
  
  let body: any = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      body = await req.blob();
    } catch {
      // No body or error reading body
    }
  }
    
  try {
    const res = await fetch(backendUrl, {
      method: req.method,
      headers,
      body,
      // @ts-ignore
      duplex: 'half'
    });
    
    const resHeaders = new Headers();
    res.headers.forEach((value, key) => {
      resHeaders.set(key, value);
    });
    
    return new NextResponse(res.body, {
      status: res.status,
      headers: resHeaders
    });
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Failed to connect to backend service" }, { status: 502 });
  }
}
