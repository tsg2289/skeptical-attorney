import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const templatesDir = path.join(process.cwd(), 'server', 'templates');
    const filePath = path.join(templatesDir, `${id}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const template = JSON.parse(content);
      
      return NextResponse.json({
        success: true,
        template,
        timestamp: new Date().toISOString()
      });
    } catch {
      return NextResponse.json(
        { error: 'Template not found', message: `Template with ID '${id}' does not exist` },
        { status: 404 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get template', message: error.message },
      { status: 500 }
    );
  }
}


