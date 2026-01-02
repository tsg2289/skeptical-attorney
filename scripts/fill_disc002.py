#!/usr/bin/env python3
"""
DISC-002 Form Filler using PyMuPDF
Fills the official California Judicial Council Form Interrogatories - Employment Law

Field names discovered by analyzing the actual DISC-002 PDF structure.
"""

import fitz  # PyMuPDF
import sys
import json
import os
from urllib.request import urlopen

# Official DISC-002 PDF URL
DISC002_URL = "https://courts.ca.gov/sites/default/files/courts/default/2024-11/disc002.pdf"

# =====================================================
# MAPPING FROM UI INTERROGATORY NUMBERS TO PDF CHECKBOX FIELD NAME PATTERNS
# Field names discovered by analyzing the actual DISC-002 PDF
# The patterns are the unique part of each field name to match
# =====================================================

UI_TO_CHECKBOX_FIELD = {
    # Section 200.0 - Contract Formation
    "200.1": "EmpRelAtWill",           # Do you contend at will?
    "200.2": "EmpRelNotAtWill",        # Do you contend not at will?
    "200.3": "EmpRelAgree",            # Agreement governed?
    "200.4": "EmpRelDoc",              # Documented rules/policies?
    "200.5": "EmpRelCollBarg",         # Collective bargaining?
    "200.6": "EmpRelOthrBiz",          # Other business relationship?
    
    # Section 201.0 - Adverse Employment Action
    "201.1": "AdvEmpActTerm",          # Termination?
    "201.2": "AdvEmpActPostTerm",      # Post-termination facts?
    "201.3": "AdvEmpActAskPrty",       # Other adverse actions (asking party lists)?
    "201.4": "AdvEmpActPerf",          # Based on performance?
    "201.5": "AdvEmpActHired",         # Was someone hired to replace?
    "201.6": "AdvEmpActReplace",       # Has person performed duties?
    "201.7": "AdvEmpActContact",       # Failure to select?
    
    # Section 202.0 - Discrimination Interrogatories to Employee
    "202.1": "Discrim[0]",             # Discriminatory adverse actions?
    "202.2": "DiscrimFacts",           # Facts supporting qualification?
    
    # Section 203.0 - Harassment Interrogatories to Employee
    "203.1": "Harassed",               # Unlawfully harassed?
    
    # Section 204.0 - Disability Discrimination
    "204.1": "DisDiscrim[0]",          # Name and describe disability
    "204.2": "DisDiscrimInjury",       # Injury/illness from employment?
    "204.3": "DisDiscrimComm[0]",      # Communications about disability (Page 4)
    "204.4": "DisDiscrimContact",      # Other info about disability?
    "204.5": "DisDiscrimAccomdn",      # Accommodation needed?
    "204.6": "Page5[0].List12",        # Communications about accommodation (Page 5)
    "204.7": "DisDiscrimConsider",     # What accommodations considered?
    
    # Section 205.0 - Discharge in Violation of Public Policy
    "205.1": "DischgViol",             # Adverse action in violation of public policy?
    
    # Section 206.0 - Defamation
    "206.1": "Defame[0]",              # Defamatory statements published?
    "206.2": "DefameRespon",           # Who responded to inquiries?
    "206.3": "DefamePub",              # Post-termination statements?
    
    # Section 207.0 - Internal Complaints
    "207.1": "IntComplaints[0]",       # Internal complaint policies?
    "207.2": "IntComplaintsConduct",   # Employee complained to employer?
    
    # Section 208.0 - Governmental Complaints
    "208.1": "GovComplaints[0]",       # Filed with governmental agency?
    "208.2": "GovComplaintsEmprRes",   # Employer respond to complaint?
    
    # Section 209.0 - Other Employment Claims
    "209.1": "OthClaimsEmplee",        # Employee filed other actions?
    "209.2": "OthClaimsEmpler",        # Other employees filed against employer?
    
    # Section 210.0 - Loss of Income to Employee
    "210.1": "LossIncomeEmpe[0]",      # Attribute loss of income?
    "210.2": "LossIncomeEmpePast",     # Total past loss?
    "210.3": "LossIncomeEmpeFuture",   # Future loss?
    "210.4": "LossIncomeEmpeMinimize", # Attempted to minimize?
    "210.5": "LossIncomeEmpePurch",    # Purchased replacement benefits?
    "210.6": "LossIncomeOthEmp",       # Obtained other employment?
    
    # Section 211.0 - Loss of Income to Employer
    "211.1": "LossIncomeEmpr[0]",      # Benefits employee entitled to?
    "211.2": "LossIncomeEmprMinimize", # Contend employee didn't minimize?
    "211.3": "LossIncomeEmprUnreason", # Contend claimed loss unreasonable?
    
    # Section 212.0 - Physical, Mental, or Emotional Injuries
    "212.1": "InjuriesEmpe[0]",        # Attribute injuries?
    "212.2": "InjuriesEmpeCurrent",    # Identify each injury?
    "212.3": "InjuriesEmpeOngoing",    # Still have complaints?
    "212.4": "InjuriesEmpeExam",       # Received treatment?
    "212.5": "InjuriesEmpeMeds",       # Taken medication?
    "212.6": "InjuriesEmpeOthExp",     # Other medical services?
    "212.7": "InjuriesEmpefuture",     # Future treatment advised?
    
    # Section 213.0 - Other Damages
    "213.1": "OthDam[0]",              # Other damages?
    "213.2": "OthDamDocs",             # Documents supporting damages?
    
    # Section 214.0 - Insurance
    "214.1": "Insurance[0]",           # Insurance policy in effect?
    "214.2": "InsuranceSelf",          # Self-insured?
    
    # Section 215.0 - Investigation
    "215.1": "InvestigationIntw",      # Interviewed anyone?
    "215.2": "InvestigationWritn",     # Obtained statements?
    
    # Section 216.0 - Denials and Special or Affirmative Defenses
    "216.1": "AffirmDefenses",         # Identify denials and defenses?
    
    # Section 217.0 - Response to Request for Admissions
    "217.1": "RespReq",                # Response to each request?
}

# Text field name patterns (discovered from PDF analysis)
# These are the native PDF form fields for text input
TEXT_FIELD_PATTERNS = {
    "attorney_info": "AttyCity_ft",        # Combined attorney name/address field
    "phone": "Phone_ft",                    # Telephone
    "fax": "Fax_ft",                        # Fax
    "email": "Email_ft",                    # Email
    "attorney_for": "TextField3",           # Attorney for
    "county": "Cell2[0].TextField1",        # County
    "short_title": "Subcell2[0].TextField2", # Short title (plaintiff vs defendant)
    "asking_party": "Cell3[0].TextField1",  # Asking party
    "answering_party": "Cell3[0].TextField2", # Answering party
    "set_number": "Cell3[0].TextField3",    # Set number
    "case_number": "Cell4[0].TextField1",   # Case number
    "employee_name": "LI4[0].FillText1",    # Employee name (for definitions)
    "employer_name": "LI5[0].FillText1",    # Employer name (for definitions)
}


def download_disc002():
    """Download the official DISC-002 PDF"""
    print(f"Downloading DISC-002 from {DISC002_URL}...")
    with urlopen(DISC002_URL) as response:
        return response.read()


def fill_disc002(data: dict, output_path: str):
    """
    Fill the DISC-002 form with provided data
    
    Args:
        data: Dictionary containing form data
        output_path: Path to save the filled PDF
    """
    # Download the template
    pdf_bytes = download_disc002()
    
    # Open with PyMuPDF
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    print(f"Loaded PDF with {len(doc)} pages")
    
    # ========================================
    # Fill text fields using native PDF form widgets
    # ========================================
    print("\nFilling text fields...")
    
    # Build attorney info block
    attorney_lines = []
    if data.get("attorney_name"):
        attorney_lines.append(data["attorney_name"])
    if data.get("bar_number"):
        attorney_lines.append(f"State Bar No. {data['bar_number']}")
    if data.get("firm_name"):
        attorney_lines.append(data["firm_name"])
    if data.get("street_address"):
        attorney_lines.append(data["street_address"])
    city_state_zip = ""
    if data.get("city"):
        city_state_zip = data["city"]
    if data.get("state"):
        city_state_zip += f", {data['state']}"
    if data.get("zip"):
        city_state_zip += f" {data['zip']}"
    if city_state_zip:
        attorney_lines.append(city_state_zip)
    attorney_block = "\n".join(attorney_lines)
    
    # Create short title
    plaintiff = data.get("plaintiff_name", "")
    defendant = data.get("defendant_name", "")
    short_title = f"{plaintiff} vs. {defendant}" if plaintiff and defendant else ""
    
    # Map of what to fill
    text_values = {
        "attorney_info": attorney_block,
        "phone": data.get("phone", ""),
        "fax": data.get("fax", ""),
        "email": data.get("email", ""),
        "attorney_for": data.get("attorney_for", ""),
        "county": (data.get("county", "") or "").upper(),
        "short_title": short_title,
        "asking_party": data.get("asking_party_name", ""),
        "answering_party": data.get("answering_party_name", ""),
        "set_number": str(data.get("set_number", 1)),
        "case_number": data.get("case_number", ""),
        "employee_name": data.get("employee_name", ""),
        "employer_name": data.get("employer_name", ""),
    }
    
    # Fill text widgets across all pages
    filled_text_count = 0
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        for widget in page.widgets():
            if widget.field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                field_name = widget.field_name or ""
                
                # Try to match against our patterns
                for key, pattern in TEXT_FIELD_PATTERNS.items():
                    if pattern in field_name:
                        value = text_values.get(key, "")
                        if value:
                            widget.field_value = value
                            widget.update()
                            print(f"  Filled '{key}': '{value[:40]}...' -> {field_name[:50]}")
                            filled_text_count += 1
                        break
    
    print(f"  Total text fields filled: {filled_text_count}")
    
    # ========================================
    # Check boxes for selected interrogatories
    # ========================================
    selected_sections = data.get("selected_sections", [])
    print(f"\nChecking {len(selected_sections)} interrogatory checkboxes...")
    
    # Build list of patterns to match
    checkbox_patterns = []
    for section in selected_sections:
        section_str = str(section)
        if section_str in UI_TO_CHECKBOX_FIELD:
            checkbox_patterns.append((section_str, UI_TO_CHECKBOX_FIELD[section_str]))
        else:
            print(f"  Warning: No checkbox mapping for section {section_str}")
    
    # Find and check matching checkbox widgets
    checked_count = 0
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        for widget in page.widgets():
            if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                field_name = widget.field_name or ""
                
                # Check if this widget matches any of our patterns
                for ui_section, pattern in checkbox_patterns:
                    if pattern in field_name:
                        # Check the checkbox
                        widget.field_value = True
                        widget.update()
                        print(f"  Checked {ui_section} -> '{field_name[:60]}' (page {page_idx + 1})")
                        checked_count += 1
                        # Remove from patterns to avoid double-checking
                        checkbox_patterns.remove((ui_section, pattern))
                        break
    
    print(f"  Total checkboxes checked: {checked_count}")
    
    # Report any unchecked sections
    if checkbox_patterns:
        print(f"\n  Warning: {len(checkbox_patterns)} sections could not be matched:")
        for ui_section, pattern in checkbox_patterns:
            print(f"    - {ui_section} (pattern: {pattern})")
    
    # Save the filled PDF
    doc.save(output_path)
    doc.close()
    print(f"\nSaved filled PDF to: {output_path}")
    return output_path


def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        # Read from file
        with open(sys.argv[1], 'r') as f:
            data = json.load(f)
        output_path = sys.argv[2] if len(sys.argv) > 2 else "filled_disc002.pdf"
    else:
        # Test data
        data = {
            "attorney_name": "John Smith",
            "bar_number": "123456",
            "firm_name": "Smith & Associates",
            "street_address": "123 Main Street, Suite 500",
            "city": "Los Angeles",
            "state": "CA",
            "zip": "90012",
            "phone": "(213) 555-1234",
            "fax": "(213) 555-1235",
            "email": "john@smithlaw.com",
            "attorney_for": "Plaintiff",
            "county": "Los Angeles",
            "plaintiff_name": "Jane Doe",
            "defendant_name": "ABC Corporation",
            "case_number": "23STCV12345",
            "asking_party_name": "Jane Doe",
            "answering_party_name": "ABC Corporation",
            "set_number": 1,
            "employee_name": "Jane Doe",
            "employer_name": "ABC Corporation",
            "selected_sections": [
                "200.1",
                "200.2", 
                "201.1",
                "201.2",
                "202.1",
                "203.1",
                "207.1",
                "207.2",
                "210.1",
                "212.1",
            ]
        }
        output_path = "test-disc002-pymupdf.pdf"
    
    fill_disc002(data, output_path)


if __name__ == "__main__":
    main()
