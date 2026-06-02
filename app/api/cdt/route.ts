import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.toString();

    const res = await fetch(`${API_URL}?${query}`, {
      cache: "no-store",
    });

    const data = await res.text();

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e: any) {
    return NextResponse.json({
      status: "ERROR",
      message: e.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const action = body.action;

    const res = await fetch(`${API_URL}?action=${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.text();

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e: any) {
    return NextResponse.json({
      status: "ERROR",
      message: e.message,
    });
  }
}