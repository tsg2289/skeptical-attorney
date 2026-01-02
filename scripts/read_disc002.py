#!/usr/bin/env python3
"""
DISC-002 Form Reader using PyMuPDF
Reads the California Judicial Council Form Interrogatories - Employment Law
and extracts which interrogatories were selected (checked).

This script reads PDF form checkboxes without requiring OCR.
Field names discovered by analyzing the actual DISC-002 PDF structure.
"""

import fitz  # PyMuPDF
import sys
import json
import os
import re

# =====================================================
# MAPPING FROM PDF CHECKBOX FIELD NAMES TO UI INTERROGATORY NUMBERS
# Field names discovered by analyzing the actual DISC-002 PDF
# =====================================================

CHECKBOX_FIELD_TO_UI = {
    # Section 200.0 - Contract Formation
    "EmpRelAtWill": "200.1",
    "EmpRelNotAtWill": "200.2",
    "EmpRelAgree": "200.3",
    "EmpRelDoc": "200.4",
    "EmpRelCollBarg": "200.5",
    "EmpRelOthrBiz": "200.6",
    
    # Section 201.0 - Adverse Employment Action
    "AdvEmpActTerm": "201.1",
    "AdvEmpActPostTerm": "201.2",
    "AdvEmpActAskPrty": "201.3",
    "AdvEmpActPerf": "201.4",
    "AdvEmpActHired": "201.5",
    "AdvEmpActReplace": "201.6",
    "AdvEmpActContact": "201.7",
    
    # Section 202.0 - Discrimination Interrogatories to Employee
    "Discrim[0]": "202.1",
    "DiscrimFacts": "202.2",
    
    # Section 203.0 - Harassment Interrogatories to Employee
    "Harassed": "203.1",
    
    # Section 204.0 - Disability Discrimination
    "DisDiscrim[0]": "204.1",
    "DisDiscrimInjury": "204.2",
    # Note: DisDiscrimComm appears twice - Page 4 is 204.3, Page 5 is 204.6
    "Page4[0].Page4[0].List9[0].#area[0].DisDiscrimComm": "204.3",
    "DisDiscrimContact": "204.4",
    "DisDiscrimAccomdn": "204.5",
    "Page5[0].List12[0].#area[0].DisDiscrimComm": "204.6",
    "DisDiscrimConsider": "204.7",
    
    # Section 205.0 - Discharge in Violation of Public Policy
    "DischgViol": "205.1",
    
    # Section 206.0 - Defamation
    "Defame[0]": "206.1",
    "DefameRespon": "206.2",
    "DefamePub": "206.3",
    
    # Section 207.0 - Internal Complaints
    "IntComplaints[0]": "207.1",
    "IntComplaintsConduct": "207.2",
    
    # Section 208.0 - Governmental Complaints
    "GovComplaints[0]": "208.1",
    "GovComplaintsEmprRes": "208.2",
    
    # Section 209.0 - Other Employment Claims
    "OthClaimsEmplee": "209.1",
    "OthClaimsEmpler": "209.2",
    
    # Section 210.0 - Loss of Income to Employee
    "LossIncomeEmpe[0]": "210.1",
    "LossIncomeEmpePast": "210.2",
    "LossIncomeEmpeFuture": "210.3",
    "LossIncomeEmpeMinimize": "210.4",
    "LossIncomeEmpePurch": "210.5",
    "LossIncomeOthEmp": "210.6",
    
    # Section 211.0 - Loss of Income to Employer
    "LossIncomeEmpr[0]": "211.1",
    "LossIncomeEmprMinimize": "211.2",
    "LossIncomeEmprUnreason": "211.3",
    
    # Section 212.0 - Physical, Mental, or Emotional Injuries
    "InjuriesEmpe[0]": "212.1",
    "InjuriesEmpeCurrent": "212.2",
    "InjuriesEmpeOngoing": "212.3",
    "InjuriesEmpeExam": "212.4",
    "InjuriesEmpeMeds": "212.5",
    "InjuriesEmpeOthExp": "212.6",
    "InjuriesEmpefuture": "212.7",
    
    # Section 213.0 - Other Damages
    "OthDam[0]": "213.1",
    "OthDamDocs": "213.2",
    
    # Section 214.0 - Insurance
    "Insurance[0]": "214.1",
    "InsuranceSelf": "214.2",
    
    # Section 215.0 - Investigation
    "InvestigationIntw": "215.1",
    "InvestigationWritn": "215.2",
    
    # Section 216.0 - Denials and Special or Affirmative Defenses
    "AffirmDefenses": "216.1",
    
    # Section 217.0 - Response to Request for Admissions
    "RespReq": "217.1",
}


def read_disc002(pdf_path: str, debug: bool = False) -> dict:
    """
    Read a DISC-002 PDF and extract which interrogatories are selected.
    
    Args:
        pdf_path: Path to the DISC-002 PDF file
        debug: If True, print all field names found
        
    Returns:
        Dictionary containing:
        - selected_interrogatories: List of selected interrogatory numbers
        - form_data: Dictionary of extracted text field values
        - all_checkboxes: List of all checkbox field names found (for debugging)
    """
    result = {
        "success": True,
        "selected_interrogatories": [],
        "form_data": {},
        "all_checkboxes": [],
        "error": None
    }
    
    try:
        # Open the PDF
        doc = fitz.open(pdf_path)
        print(f"Opened PDF with {len(doc)} pages", file=sys.stderr)
        
        selected = []
        all_checkboxes = []
        form_data = {}
        
        # Iterate through all pages
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            
            # Get all widgets (form fields) on this page
            for widget in page.widgets():
                field_name = widget.field_name or ""
                field_type = widget.field_type
                
                # Handle checkboxes
                if field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                    all_checkboxes.append({
                        "name": field_name,
                        "page": page_idx + 1,
                        "checked": widget.field_value
                    })
                    
                    if debug:
                        print(f"  Checkbox: {field_name} = {widget.field_value}", file=sys.stderr)
                    
                    # Check if this checkbox is checked
                    if widget.field_value:
                        # Try to map this field to a UI interrogatory number
                        mapped = False
                        for pattern, ui_num in CHECKBOX_FIELD_TO_UI.items():
                            if pattern in field_name:
                                if ui_num not in selected:
                                    selected.append(ui_num)
                                    print(f"  Found checked: {field_name[:60]} -> {ui_num}", file=sys.stderr)
                                mapped = True
                                break
                        
                        # If not in our mapping, try to extract number from field name
                        if not mapped:
                            # Try to find patterns like "200.1", "201.2", etc.
                            match = re.search(r'(\d{3}\.\d+)', field_name)
                            if match:
                                ui_num = match.group(1)
                                if ui_num not in selected:
                                    selected.append(ui_num)
                                    print(f"  Found checked (regex): {field_name} -> {ui_num}", file=sys.stderr)
                
                # Handle text fields (extract case info if available)
                elif field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                    value = widget.field_value
                    if value:
                        # Store with a simplified key
                        simple_name = field_name.split("[")[-1].rstrip("]") if "[" in field_name else field_name
                        form_data[simple_name] = value
                        if debug:
                            print(f"  Text field: {field_name} = {value[:50]}...", file=sys.stderr)
        
        doc.close()
        
        # Sort selected interrogatories by section number
        def sort_key(x):
            try:
                parts = x.split('.')
                return (int(parts[0]), int(parts[1]) if len(parts) > 1 else 0)
            except (ValueError, IndexError):
                return (999, 999)
        
        result["selected_interrogatories"] = sorted(selected, key=sort_key)
        result["form_data"] = form_data
        result["all_checkboxes"] = all_checkboxes
        
        print(f"Found {len(selected)} selected interrogatories", file=sys.stderr)
        
    except Exception as e:
        result["success"] = False
        result["error"] = str(e)
        print(f"Error reading PDF: {e}", file=sys.stderr)
    
    return result


def read_disc002_from_bytes(pdf_bytes: bytes, debug: bool = False) -> dict:
    """
    Read DISC-002 from bytes (for in-memory processing).
    
    Args:
        pdf_bytes: PDF file content as bytes
        debug: If True, print all field names found
        
    Returns:
        Same as read_disc002()
    """
    result = {
        "success": True,
        "selected_interrogatories": [],
        "form_data": {},
        "all_checkboxes": [],
        "error": None
    }
    
    try:
        # Open from bytes
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        print(f"Opened PDF with {len(doc)} pages", file=sys.stderr)
        
        selected = []
        all_checkboxes = []
        form_data = {}
        
        # Iterate through all pages
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            
            for widget in page.widgets():
                field_name = widget.field_name or ""
                field_type = widget.field_type
                
                if field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                    all_checkboxes.append({
                        "name": field_name,
                        "page": page_idx + 1,
                        "checked": widget.field_value
                    })
                    
                    if debug:
                        print(f"  Checkbox: {field_name} = {widget.field_value}", file=sys.stderr)
                    
                    if widget.field_value:
                        mapped = False
                        for pattern, ui_num in CHECKBOX_FIELD_TO_UI.items():
                            if pattern in field_name:
                                if ui_num not in selected:
                                    selected.append(ui_num)
                                    print(f"  Found checked: {field_name[:60]} -> {ui_num}", file=sys.stderr)
                                mapped = True
                                break
                        
                        if not mapped:
                            match = re.search(r'(\d{3}\.\d+)', field_name)
                            if match:
                                ui_num = match.group(1)
                                if ui_num not in selected:
                                    selected.append(ui_num)
                                    print(f"  Found checked (regex): {field_name} -> {ui_num}", file=sys.stderr)
                
                elif field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                    value = widget.field_value
                    if value:
                        simple_name = field_name.split("[")[-1].rstrip("]") if "[" in field_name else field_name
                        form_data[simple_name] = value
        
        doc.close()
        
        def sort_key(x):
            try:
                parts = x.split('.')
                return (int(parts[0]), int(parts[1]) if len(parts) > 1 else 0)
            except (ValueError, IndexError):
                return (999, 999)
        
        result["selected_interrogatories"] = sorted(selected, key=sort_key)
        result["form_data"] = form_data
        result["all_checkboxes"] = all_checkboxes
        
        print(f"Found {len(selected)} selected interrogatories", file=sys.stderr)
        
    except Exception as e:
        result["success"] = False
        result["error"] = str(e)
        print(f"Error reading PDF: {e}", file=sys.stderr)
    
    return result


def main():
    """Main entry point - reads PDF path from argument or stdin."""
    if len(sys.argv) < 2:
        print("Usage: read_disc002.py <pdf_path> [output_json_path] [--debug]", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None
    debug = '--debug' in sys.argv
    
    if not os.path.exists(pdf_path):
        print(json.dumps({
            "success": False,
            "error": f"File not found: {pdf_path}",
            "selected_interrogatories": [],
            "form_data": {},
            "all_checkboxes": []
        }))
        sys.exit(1)
    
    result = read_disc002(pdf_path, debug=debug)
    
    if output_path:
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Results written to: {output_path}", file=sys.stderr)
    else:
        # Output JSON to stdout
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
