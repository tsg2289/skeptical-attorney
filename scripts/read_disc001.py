#!/usr/bin/env python3
"""
DISC-001 Form Reader using PyMuPDF
Reads the California Judicial Council Form Interrogatories - General
and extracts which interrogatories were selected (checked).

This script reads PDF form checkboxes without requiring OCR.
"""

import fitz  # PyMuPDF
import sys
import json
import os

# =====================================================
# MAPPING FROM PDF CHECKBOX FIELD NAMES TO UI INTERROGATORY NUMBERS
# The PDF has native checkbox widgets with specific field names
# This is the REVERSE mapping of fill_disc001.py
# =====================================================

# Maps PDF checkbox field name patterns -> UI interrogatory number
CHECKBOX_FIELD_TO_UI = {
    # Section 1 - Identity
    "Identity": "1",
    
    # Section 2.x - General Background Information (Individual)
    "GenBkgrd[0]": "2",       # 2.1
    "GenBkgrd2": "3",         # 2.2
    "GenBkgrd3": "4",         # 2.3
    "GenBkgrd4": "5",         # 2.4
    "GenBkgrd5": "6",         # 2.5
    "GenBkgrd6": "7",         # 2.6
    "GenBkgrd7": "8",         # 2.7
    "GenBkgrd8": "9",         # 2.8
    "GenBkgrd9": "10",        # 2.9
    "GenBkgrd10": "11",       # 2.10
    "GenBkgrd11": "12",       # 2.11
    
    # Section 4.x - Insurance
    "Insurance[0]": "17",     # 4.1
    "Insurance": "17",        # Alternative name
    
    # Section 6.x - Personal Injury
    "PMEInjuries[0]": "6.1",  # 6.1
    "PMEInjuries2": "6.2",    # 6.2
    "PMEInjuries3": "6.3",    # 6.3
    "PMEInjuries4": "6.4",    # 6.4
    "PMEInjuries5": "6.5",    # 6.5
    "PMEInjuries6": "6.6",    # 6.6
    "PMEInjuries7": "6.7",    # 6.7
    
    # Section 7.x - Property Damage
    "PropDam[0]": "7.1",      # 7.1
    "PropDam2": "7.2",        # 7.2
    "PropDam3": "7.3",        # 7.3
    
    # Section 8.x - Loss of Income
    "LostincomeEarn[0]": "8.1",  # 8.1
    "LostincomeEarn2": "8.2",    # 8.2
    "LostincomeEarn3": "8.3",    # 8.3
    "LostincomeEarn4": "8.4",    # 8.4
    "LostincomeEarn5": "8.5",    # 8.5
    "LostincomeEarn6": "8.6",    # 8.6
    "LostincomeEarn7": "8.7",    # 8.7
    "LostincomeEarn8": "8.8",    # 8.8
    
    # Section 9.x - Other Damages
    "OtherDam[0]": "9.1",     # 9.1
    "OtherDam2": "9.2",       # 9.2
    
    # Section 10.x - Medical History
    "MedHist[0]": "10.1",     # 10.1
    "MedHist2": "10.2",       # 10.2
    "MedHist3": "10.3",       # 10.3
    
    # Section 11.x - Other Claims
    "OtherClaims[0]": "11.1", # 11.1
    "OtherClaims2": "11.2",   # 11.2
    
    # Section 12.x - Investigation General
    "InvestGen[0]": "12.1",   # 12.1
    "InvestGen2": "12.2",     # 12.2
    "InvestGen3": "12.3",     # 12.3
    "InvestGen4": "12.4",     # 12.4
    "InvestGen5": "12.5",     # 12.5
    "InvestGen6": "12.6",     # 12.6
    "InvestGen7": "12.7",     # 12.7
    
    # Section 13.x - Contentions
    "Content[0]": "13.1",     # 13.1
    "Content2": "13.2",       # 13.2
    
    # Section 14.x - Application of statutes
    "StatApp[0]": "14.1",     # 14.1
    "StatApp2": "14.2",       # 14.2
    
    # Section 15.x - Denials/special or affirmative defenses
    "Denials[0]": "15.1",     # 15.1
    
    # Section 16.x - Defendant's contentions
    "DefContent[0]": "16.1",  # 16.1
    "DefContent2": "16.2",    # 16.2
    "DefContent3": "16.3",    # 16.3
    "DefContent4": "16.4",    # 16.4
    "DefContent5": "16.5",    # 16.5
    "DefContent6": "16.6",    # 16.6
    "DefContent7": "16.7",    # 16.7
    "DefContent8": "16.8",    # 16.8
    "DefContent9": "16.9",    # 16.9
    "DefContent10": "16.10",  # 16.10
    
    # Section 17.x - Response to request
    "Response[0]": "17.1",    # 17.1
}


def read_disc001(pdf_path: str) -> dict:
    """
    Read a DISC-001 PDF and extract which interrogatories are selected.
    
    Args:
        pdf_path: Path to the DISC-001 PDF file
        
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
                    
                    # Check if this checkbox is checked
                    if widget.field_value:
                        # Try to map this field to a UI interrogatory number
                        for pattern, ui_num in CHECKBOX_FIELD_TO_UI.items():
                            if pattern in field_name:
                                if ui_num not in selected:
                                    selected.append(ui_num)
                                    print(f"  Found checked: {field_name} -> {ui_num}", file=sys.stderr)
                                break
                
                # Handle text fields (extract case info if available)
                elif field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                    value = widget.field_value
                    if value:
                        # Store with a simplified key
                        simple_name = field_name.split("[")[-1].rstrip("]") if "[" in field_name else field_name
                        form_data[simple_name] = value
        
        doc.close()
        
        # Sort selected interrogatories numerically
        def sort_key(x):
            try:
                return float(x)
            except ValueError:
                return float('inf')
        
        result["selected_interrogatories"] = sorted(selected, key=sort_key)
        result["form_data"] = form_data
        result["all_checkboxes"] = all_checkboxes
        
        print(f"Found {len(selected)} selected interrogatories", file=sys.stderr)
        
    except Exception as e:
        result["success"] = False
        result["error"] = str(e)
        print(f"Error reading PDF: {e}", file=sys.stderr)
    
    return result


def read_disc001_from_bytes(pdf_bytes: bytes) -> dict:
    """
    Read DISC-001 from bytes (for in-memory processing).
    
    Args:
        pdf_bytes: PDF file content as bytes
        
    Returns:
        Same as read_disc001()
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
                    
                    if widget.field_value:
                        for pattern, ui_num in CHECKBOX_FIELD_TO_UI.items():
                            if pattern in field_name:
                                if ui_num not in selected:
                                    selected.append(ui_num)
                                    print(f"  Found checked: {field_name} -> {ui_num}", file=sys.stderr)
                                break
                
                elif field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                    value = widget.field_value
                    if value:
                        simple_name = field_name.split("[")[-1].rstrip("]") if "[" in field_name else field_name
                        form_data[simple_name] = value
        
        doc.close()
        
        def sort_key(x):
            try:
                return float(x)
            except ValueError:
                return float('inf')
        
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
        print("Usage: read_disc001.py <pdf_path> [output_json_path]", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(pdf_path):
        print(json.dumps({
            "success": False,
            "error": f"File not found: {pdf_path}",
            "selected_interrogatories": [],
            "form_data": {},
            "all_checkboxes": []
        }))
        sys.exit(1)
    
    result = read_disc001(pdf_path)
    
    if output_path:
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Results written to: {output_path}", file=sys.stderr)
    else:
        # Output JSON to stdout
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
