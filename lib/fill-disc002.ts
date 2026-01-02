import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface DISC002FormData {
  // Attorney/Party Info (top left block)
  attorneyName: string
  barNumber: string
  firmName?: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  fax?: string
  email?: string
  attorneyFor: string // "Plaintiff" or "Defendant"
  
  // Court Info
  county: string
  branchName?: string
  streetAddressCourt?: string
  mailingAddress?: string
  cityZipCourt?: string
  
  // Case Info
  plaintiffName: string
  defendantName: string
  caseNumber: string
  
  // Discovery Info
  askingPartyName: string
  answeringPartyName: string
  setNumber: number
  
  // DISC-002 Specific - Employee/Employer Names
  employeeName?: string
  employerName?: string
  
  // Which sections to check (interrogatory numbers like "200.1", "201.3")
  selectedSections: string[]
}

/**
 * Execute a command with proper argument handling (no shell escaping issues)
 */
function execCommand(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    let stdout = ''
    let stderr = ''
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`))
      }
    })
    
    proc.on('error', (err) => {
      reject(err)
    })
    
    // Timeout after 60 seconds
    setTimeout(() => {
      proc.kill()
      reject(new Error('Process timed out'))
    }, 60000)
  })
}

/**
 * Fill the official California DISC-002 PDF using PyMuPDF
 * This uses a Python script with PyMuPDF which can handle XFA forms
 */
export async function fillDISC002Form(data: DISC002FormData): Promise<Uint8Array> {
  console.log('Filling official DISC-002 PDF using PyMuPDF...')
  
  // Create temp files for input JSON and output PDF
  const tempDir = os.tmpdir()
  const timestamp = Date.now()
  const inputJsonPath = path.join(tempDir, `disc002-input-${timestamp}.json`)
  const outputPdfPath = path.join(tempDir, `disc002-output-${timestamp}.pdf`)
  
  // Convert TypeScript interface to Python-friendly format
  const pythonData = {
    attorney_name: data.attorneyName,
    bar_number: data.barNumber,
    firm_name: data.firmName,
    street_address: data.streetAddress,
    city: data.city,
    state: data.state,
    zip: data.zip,
    phone: data.phone,
    fax: data.fax,
    email: data.email,
    attorney_for: data.attorneyFor,
    county: data.county,
    plaintiff_name: data.plaintiffName,
    defendant_name: data.defendantName,
    case_number: data.caseNumber,
    asking_party_name: data.askingPartyName,
    answering_party_name: data.answeringPartyName,
    set_number: data.setNumber,
    employee_name: data.employeeName,
    employer_name: data.employerName,
    selected_sections: data.selectedSections
  }
  
  try {
    // Write input JSON
    fs.writeFileSync(inputJsonPath, JSON.stringify(pythonData, null, 2))
    console.log('Wrote input JSON to:', inputJsonPath)
    
    // Get the project root directory
    const projectRoot = process.cwd()
    const pythonScript = path.join(projectRoot, 'scripts', 'fill_disc002.py')
    const venvPython = path.join(projectRoot, '.venv', 'bin', 'python3')
    
    // Check if venv exists, otherwise use system python
    const pythonPath = fs.existsSync(venvPython) ? venvPython : 'python3'
    
    console.log('Python path:', pythonPath)
    console.log('Script path:', pythonScript)
    
    // Execute Python script using spawn (handles spaces in paths properly)
    const { stdout, stderr } = await execCommand(
      pythonPath,
      [pythonScript, inputJsonPath, outputPdfPath],
      projectRoot
    )
    
    if (stdout) console.log('Python output:', stdout)
    if (stderr) console.warn('Python stderr:', stderr)
    
    // Read the output PDF
    if (!fs.existsSync(outputPdfPath)) {
      throw new Error('Python script did not create output PDF')
    }
    
    const pdfBuffer = fs.readFileSync(outputPdfPath)
    console.log('Generated PDF size:', pdfBuffer.length, 'bytes')
    
    // Clean up temp files
    try {
      fs.unlinkSync(inputJsonPath)
      fs.unlinkSync(outputPdfPath)
    } catch {
      // Ignore cleanup errors
    }
    
    return new Uint8Array(pdfBuffer)
    
  } catch (error) {
    // Clean up on error
    try {
      if (fs.existsSync(inputJsonPath)) fs.unlinkSync(inputJsonPath)
      if (fs.existsSync(outputPdfPath)) fs.unlinkSync(outputPdfPath)
    } catch {
      // Ignore cleanup errors
    }
    
    console.error('Error filling DISC-002:', error)
    throw new Error(`Failed to fill DISC-002: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get field names (not applicable for XFA forms)
 */
export async function getDISC002FieldNames(): Promise<{ name: string; type: string }[]> {
  // XFA forms don't expose field names the same way
  return []
}
