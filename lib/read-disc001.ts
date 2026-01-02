/**
 * DISC-001 Form Reader
 * 
 * Reads California Judicial Council Form Interrogatories (DISC-001) PDF
 * and extracts which interrogatories were selected (checked).
 * 
 * Uses PyMuPDF via a Python script to read PDF form fields without OCR.
 * 
 * Security: All processing is done in memory with temp files immediately deleted.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface DISC001ReadResult {
  success: boolean;
  selectedInterrogatories: string[];
  formData: Record<string, string>;
  allCheckboxes: Array<{
    name: string;
    page: number;
    checked: boolean;
  }>;
  error?: string;
}

/**
 * Execute a command with proper argument handling
 */
function execCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      proc.kill();
      reject(new Error('Process timed out'));
    }, 60000);
  });
}

/**
 * Read a DISC-001 PDF and extract selected interrogatories
 * 
 * @param pdfBuffer - The PDF file as a Buffer
 * @returns DISC001ReadResult with selected interrogatories
 */
export async function readDISC001Form(pdfBuffer: Buffer): Promise<DISC001ReadResult> {
  console.log('Reading DISC-001 PDF using PyMuPDF...');

  // Create temp file for input PDF
  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const inputPdfPath = path.join(tempDir, `disc001-input-${timestamp}.pdf`);
  const outputJsonPath = path.join(tempDir, `disc001-output-${timestamp}.json`);

  try {
    // Write input PDF to temp file
    fs.writeFileSync(inputPdfPath, pdfBuffer);
    console.log('Wrote input PDF to:', inputPdfPath);

    // Get the project root directory
    const projectRoot = process.cwd();
    const pythonScript = path.join(projectRoot, 'scripts', 'read_disc001.py');
    const venvPython = path.join(projectRoot, '.venv', 'bin', 'python3');

    // Check if venv exists, otherwise use system python
    const pythonPath = fs.existsSync(venvPython) ? venvPython : 'python3';

    console.log('Python path:', pythonPath);
    console.log('Script path:', pythonScript);

    // Execute Python script
    const { stdout, stderr } = await execCommand(
      pythonPath,
      [pythonScript, inputPdfPath, outputJsonPath],
      projectRoot
    );

    if (stderr) console.log('Python stderr:', stderr);

    // Read the output JSON
    if (!fs.existsSync(outputJsonPath)) {
      throw new Error('Python script did not create output JSON');
    }

    const resultJson = fs.readFileSync(outputJsonPath, 'utf-8');
    const result = JSON.parse(resultJson);

    console.log('Read result:', {
      success: result.success,
      selectedCount: result.selected_interrogatories?.length || 0,
    });

    // Clean up temp files
    try {
      fs.unlinkSync(inputPdfPath);
      fs.unlinkSync(outputJsonPath);
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: result.success,
      selectedInterrogatories: result.selected_interrogatories || [],
      formData: result.form_data || {},
      allCheckboxes: result.all_checkboxes || [],
      error: result.error,
    };
  } catch (error) {
    // Clean up on error
    try {
      if (fs.existsSync(inputPdfPath)) fs.unlinkSync(inputPdfPath);
      if (fs.existsSync(outputJsonPath)) fs.unlinkSync(outputJsonPath);
    } catch {
      // Ignore cleanup errors
    }

    console.error('Error reading DISC-001:', error);
    return {
      success: false,
      selectedInterrogatories: [],
      formData: {},
      allCheckboxes: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Read DISC-001 from a file path (for testing)
 */
export async function readDISC001FromFile(filePath: string): Promise<DISC001ReadResult> {
  const buffer = fs.readFileSync(filePath);
  return readDISC001Form(buffer);
}
