import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const templatesDir = path.join(process.cwd(), 'server', 'templates');
    
    try {
      const files = await fs.readdir(templatesDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      const templates = [];
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(templatesDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const template = JSON.parse(content);
          templates.push(template);
        } catch (error) {
          console.error(`Error loading template ${file}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        templates,
        count: templates.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      // Templates directory doesn't exist yet - return empty array
      return NextResponse.json({
        success: true,
        templates: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get templates', message: error.message },
      { status: 500 }
    );
  }
}


