import {
  getSupportContact,
  hasSupportContact,
} from "@/lib/support-contact";
import { NextResponse } from "next/server";

/** 公开：用户联系客服方式（来自环境变量） */
export async function GET() {
  const contact = getSupportContact();
  return NextResponse.json({
    contact,
    configured: hasSupportContact(contact),
  });
}
