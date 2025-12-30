#!/usr/bin/env python3
"""
DISC-001 Form Filler using PyMuPDF
Fills the official California Judicial Council Form Interrogatories - General
"""

import fitz  # PyMuPDF
import sys
import json
import os
from urllib.request import urlopen

# Official DISC-001 PDF URL
DISC001_URL = "https://courts.ca.gov/sites/default/files/courts/default/2024-11/disc001.pdf"

# =====================================================
# PAGE 1 FIELD COORDINATES (measured from TOP-LEFT)
# PyMuPDF uses top-left as origin (0,0)
# Page size: 612 x 792 points
# =====================================================

# The form has labeled fields. Text should go AFTER the label.
# Based on exact bounding box analysis of label positions:
# - x position: right after where label text ends (x1 + small padding)
# - y position: use y1 (bottom) of label which is near the text baseline
PAGE1_TEXT_FIELDS = {
    # Attorney block fields (top section)
    # Format: field_name: (x, y, fontsize)
    # Coordinates derived from actual PDF text positions
    
    # NAME: label ends at x1=55.7, y1=70.2
    "attorney_name": (58, 70, 10),
    
    # STATE BAR NUMBER: label ends at x1=485.9, y1=58.6
    "bar_number": (488, 59, 9),
    
    # FIRM NAME: label ends at x1=72.0, y1=81.7
    "firm_name": (75, 82, 9),
    
    # STREET ADDRESS: label ends at x1=92.7, y1=93.4
    "street_address": (95, 93, 9),
    
    # CITY: label ends at x1=52.0, y1=104.9
    "city": (54, 105, 9),
    
    # STATE: label ends at x1=444.6, y1=104.9
    "state": (447, 105, 9),
    
    # ZIP CODE: label ends at x1=505.9, y1=104.9
    "zip": (508, 105, 9),
    
    # TELEPHONE NO.: label ends at x1=87.1, y1=116.4
    "phone": (90, 116, 9),
    
    # FAX NO.: label ends at x1=408.9, y1=116.4
    "fax": (411, 116, 9),
    
    # EMAIL ADDRESS: label ends at x1=87.1, y1=128.0
    "email": (90, 128, 9),
    
    # ATTORNEY FOR (name): - need to place after "(name):" which ends around x=120
    "attorney_for": (122, 140, 9),
    
    # Court section - "COUNTY OF" ends at x1=225.6, y1=155.7
    "county": (228, 156, 10),
    
    # Short title - on a separate line below label (y adjusted for input line)
    "short_title": (38, 188, 9),
    
    # Case number - to the right, in the box area
    "case_number": (430, 210, 10),
    
    # Discovery party fields
    # Asking Party: label ends at x1=115.3, y1=227.8
    "asking_party": (118, 228, 10),
    
    # Answering Party: label ends at x1=117.8, y1=244.5
    "answering_party": (120, 245, 10),
    
    # Set No.: label ends at x1=114.8, y1=261.2
    "set_number": (117, 261, 10),
}

# =====================================================
# MAPPING FROM UI INTERROGATORY NUMBERS TO PDF CHECKBOX FIELD NAMES
# The PDF has native checkbox widgets with specific field names
# =====================================================

# Maps UI interrogatory number -> PDF checkbox field name (partial match)
UI_TO_CHECKBOX_FIELD = {
    # Section 1 - Identity
    "1": "Identity",
    
    # Section 2.x - General Background Information (Individual)
    "2": "GenBkgrd[0]",       # 2.1 - matches "GenBkgrd[0]"
    "3": "GenBkgrd2",         # 2.2
    "4": "GenBkgrd3",         # 2.3
    "5": "GenBkgrd4",         # 2.4
    "6": "GenBkgrd5",         # 2.5
    "7": "GenBkgrd6",         # 2.6
    "8": "GenBkgrd7",         # 2.7
    "9": "GenBkgrd8",         # 2.8
    "10": "GenBkgrd9",        # 2.9
    "11": "GenBkgrd10",       # 2.10
    "12": "GenBkgrd11",       # 2.11
    
    # Section 4.x - Insurance (UI uses 17)
    "17": "Insurance[0]",     # 4.1
    
    # Section 6.x - Personal Injury
    "6.1": "PMEInjuries[0]",  # 6.1
    "6.2": "PMEInjuries2",    # 6.2
    "6.3": "PMEInjuries3",    # 6.3
    "6.4": "PMEInjuries4",    # 6.4
    "6.5": "PMEInjuries5",    # 6.5
    "6.6": "PMEInjuries6",    # 6.6
    "6.7": "PMEInjuries7",    # 6.7
    
    # Section 7.x - Property Damage
    "7.1": "PropDam[0]",      # 7.1
    "7.2": "PropDam2",        # 7.2
    "7.3": "PropDam3",        # 7.3
    
    # Section 8.x - Loss of Income
    "8.1": "LostincomeEarn[0]",  # 8.1
    "8.2": "LostincomeEarn2",    # 8.2
    "8.3": "LostincomeEarn3",    # 8.3
    "8.4": "LostincomeEarn4",    # 8.4
    "8.5": "LostincomeEarn5",    # 8.5
    "8.6": "LostincomeEarn6",    # 8.6
    "8.7": "LostincomeEarn7",    # 8.7
    "8.8": "LostincomeEarn8",    # 8.8
    
    # Section 9.x - Other Damages
    "9.1": "OtherDam[0]",     # 9.1
    "9.2": "OtherDam2",       # 9.2
    
    # Section 10.x - Medical History
    "10.1": "MedHist[0]",     # 10.1
    "10.2": "MedHist2",       # 10.2
    "10.3": "MedHist3",       # 10.3
    
    # Section 11.x - Other Claims
    "11.1": "OtherClaims[0]", # 11.1
    "11.2": "OtherClaims2",   # 11.2
    
    # Section 12.x - Investigation General
    "12.1": "InvestGen[0]",   # 12.1
    "12.2": "InvestGen2",     # 12.2
    "12.3": "InvestGen3",     # 12.3
    "12.4": "InvestGen4",     # 12.4
    "12.5": "InvestGen5",     # 12.5
    "12.6": "InvestGen6",     # 12.6
    "12.7": "InvestGen7",     # 12.7
}

# Legacy mapping for backwards compatibility
UI_TO_DISC001_MAPPING = {
    "1": "1.1", "2": "2.1", "3": "2.2", "4": "2.3", "5": "2.4",
    "6": "2.5", "7": "2.6", "8": "2.7", "9": "2.8", "10": "2.9",
    "11": "2.10", "12": "2.11", "17": "4.1",
    "6.1": "6.1", "6.2": "6.2", "6.3": "6.3", "6.4": "6.4",
    "6.5": "6.5", "6.6": "6.6", "6.7": "6.7",
    "7.1": "7.1", "7.2": "7.2", "7.3": "7.3",
    "8.1": "8.1", "8.2": "8.2", "8.3": "8.3",
    "9.1": "9.1", "9.2": "9.2",
    "10.1": "10.1", "10.2": "10.2", "10.3": "10.3",
    "11.1": "11.1", "11.2": "11.2",
    "12.1": "12.1", "12.2": "12.2", "12.3": "12.3", "12.4": "12.4",
    "12.5": "12.5", "12.6": "12.6", "12.7": "12.7",
}

# Checkbox positions for interrogatory sections on DISC-001
# Format: section_number: (page_index, x, y) where page_index is 0-based
# The y coordinate is the TEXT BASELINE position for drawing the X mark
# Checkboxes are small squares to the LEFT of each interrogatory number
# Based on visual analysis of DISC-001 form pages
CHECKBOX_POSITIONS = {
    # PAGE 2 (index 1) - Section 1 and 2 interrogatories (right column)
    # Checkboxes are small squares to the LEFT of the interrogatory number
    # X mark should be placed at the TOP of the checkbox (slightly above text baseline)
    "1.1": (1, 318, 46),     # "1.1 State the name..." - Identity question
    "2.1": (1, 318, 134),    # "2.1 State:" - Names
    "2.2": (1, 318, 178),    # "2.2 State the date and place of birth"  
    "2.3": (1, 318, 207),    # "2.3 At the time..." - driver's license
    "2.4": (1, 318, 284),    # "2.4 At the time..." - other permits
    "2.5": (1, 318, 372),    # "2.5 State:" - residence
    "2.6": (1, 318, 436),    # "2.6 State:" - employment
    "2.7": (1, 318, 522),    # "2.7 State:" - education
    "2.8": (1, 318, 608),    # "2.8 Have you ever been convicted"
    "2.9": (1, 318, 682),    # "2.9 Can you speak English"
    "2.10": (1, 318, 724),   # "2.10 Can you read and write"
    
    # PAGE 3 (index 2) - Sections 2.11-2.13, 3.x, 4.x, 6.x
    "2.11": (2, 44, 63),     # "2.11 At the time of incident..."
    "2.12": (2, 44, 124),    # "2.12"
    "2.13": (2, 44, 217),    # "2.13 Within 24 hours..."
    "3.1": (2, 44, 450),     # "3.1 Are you a corporation?"
    "3.2": (2, 44, 534),     # "3.2 Are you a partnership?"
    "3.4": (2, 318, 62),     # "3.4 Are you a joint venture?" (right col)
    "4.1": (2, 318, 391),    # "4.1 At the time of incident - insurance" (right col)
    "6.1": (2, 318, 675),    # "6.1 Do you attribute any injuries..."
    "6.2": (2, 318, 713),    # "6.2 Identify each injury..." (right col)
    
    # PAGE 4 (index 3) - Sections 6.3-6.7, 7.x, 8.x
    "6.3": (3, 44, 62),      # "6.3 State..."
    "6.4": (3, 44, 138),     # "6.4 Do you still have..."
    "6.5": (3, 44, 260),     # "6.5 Are there..."
    "6.6": (3, 44, 407),     # "6.6 State the name of health care providers"
    "6.7": (3, 44, 520),     # "6.7 Has any health care provider..."
    "7.1": (3, 44, 650),     # "7.1 Do you attribute any property damage..."
    "7.2": (3, 44, 710),     # "7.2 Has the property been repaired..."
    "8.1": (3, 318, 390),    # "8.1 State..." (right col)
    "8.2": (3, 318, 439),    # "8.2 State:" (right col)
    "8.3": (3, 318, 500),    # "8.3 State the last date..." (right col)
    "8.4": (3, 318, 528),    # "8.4 State your monthly income..." (right col)
    "8.5": (3, 318, 580),    # "8.5" (right col)
    "8.6": (3, 318, 640),    # "8.6" (right col)
    "8.7": (3, 318, 700),    # "8.7" (right col)
    
    # PAGE 5 (index 4) - Sections 9.x, 10.x, 11.x, 12.x
    "9.1": (4, 44, 82),      # "9.1 Are there any other damages..."
    "9.2": (4, 44, 197),     # "9.2 Do any documents..."
    "10.1": (4, 44, 276),    # "10.1 At any time before..."
    "10.2": (4, 44, 360),    # "10.2 List all physical..."
    "10.3": (4, 44, 444),    # "10.3 At any time after..."
    "11.1": (4, 44, 615),    # "11.1 Except for this action..."
    "11.2": (4, 44, 720),    # "11.2 In the past 10 years..."
    "12.1": (4, 318, 382),   # "12.1 State the name..." (right col)
    "12.2": (4, 318, 517),   # "12.2 Have you or anyone..." (right col)
    "12.3": (4, 318, 614),   # "12.3 Have you or anyone..." (right col)
    
    # PAGE 6 (index 5) - Sections 12.4-12.7, 13.x, 14.x, 15.x, 16.x
    "12.4": (5, 44, 65),     # "12.4 Do you or anyone..."
    "12.5": (5, 44, 245),    # "12.5 Do you or anyone..."
    "12.6": (5, 44, 361),    # "12.6 Was a report made..."
    "12.7": (5, 44, 470),    # "12.7 Have you or anyone..."
    "13.1": (5, 44, 578),    # "13.1 Have you or anyone..."
    "13.2": (5, 318, 65),    # "13.2 Has a written report..." (right col)
    "14.1": (5, 318, 168),   # "14.1 Do you or anyone..." (right col)
    "14.2": (5, 318, 244),   # "14.2 Was any person..." (right col)
    "15.1": (5, 318, 370),   # "15.1 Identify each denial..." (right col)
    "16.1": (5, 318, 518),   # "16.1 Do you contend..." (right col)
    "16.2": (5, 318, 620),   # "16.2 Do you contend..." (right col)
    
    # PAGE 7 (index 6) - Sections 16.x, 17.x
    "16.3": (6, 44, 62),     # "16.3"
    "16.4": (6, 44, 150),    # "16.4"
    "16.5": (6, 44, 238),    # "16.5"
    "16.6": (6, 44, 326),    # "16.6"
    "16.7": (6, 44, 414),    # "16.7"
    "16.8": (6, 44, 502),    # "16.8"
    "16.9": (6, 318, 197),   # "16.9 Do you contend..." (right col)
    "16.10": (6, 318, 320),  # "16.10 Do you contend..." (right col)
    "17.1": (6, 318, 475),   # "17.1 Is your response..." (right col)
}


def download_disc001():
    """Download the official DISC-001 PDF"""
    print(f"Downloading DISC-001 from {DISC001_URL}...")
    with urlopen(DISC001_URL) as response:
        return response.read()


def fill_disc001(data: dict, output_path: str):
    """
    Fill the DISC-001 form with provided data
    
    Args:
        data: Dictionary containing form data
        output_path: Path to save the filled PDF
    """
    # Download the template
    pdf_bytes = download_disc001()
    
    # Open with PyMuPDF
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    print(f"Loaded PDF with {len(doc)} pages")
    
    page0 = doc[0]
    page_height = page0.rect.height
    page_width = page0.rect.width
    print(f"Page dimensions: {page_width} x {page_height}")
    
    # Font settings
    fontname = "helv"  # Helvetica
    
    # ========================================
    # Fill text fields on Page 1
    # ========================================
    page1 = doc[0]
    
    # Helper to insert text at position
    def insert_field(field_name, value):
        if not value:
            return
        if field_name in PAGE1_TEXT_FIELDS:
            x, y, fontsize = PAGE1_TEXT_FIELDS[field_name]
            page1.insert_text((x, y), str(value), fontsize=fontsize, fontname=fontname)
            print(f"  Filled {field_name}: '{value}' at ({x}, {y})")
    
    # Attorney info
    insert_field("attorney_name", data.get("attorney_name"))
    insert_field("bar_number", data.get("bar_number"))
    insert_field("firm_name", data.get("firm_name"))
    insert_field("street_address", data.get("street_address"))
    insert_field("city", data.get("city"))
    insert_field("state", data.get("state"))
    insert_field("zip", data.get("zip"))
    insert_field("phone", data.get("phone"))
    insert_field("fax", data.get("fax"))
    insert_field("email", data.get("email"))
    insert_field("attorney_for", data.get("attorney_for"))
    
    # Court info
    insert_field("county", data.get("county", "").upper() if data.get("county") else None)
    
    # Case info - create short title from plaintiff/defendant
    plaintiff = data.get("plaintiff_name", "")
    defendant = data.get("defendant_name", "")
    if plaintiff and defendant:
        short_title = f"{plaintiff} vs. {defendant}"
        insert_field("short_title", short_title)
    
    insert_field("case_number", data.get("case_number"))
    
    # Discovery parties
    insert_field("asking_party", data.get("asking_party_name"))
    insert_field("answering_party", data.get("answering_party_name"))
    insert_field("set_number", data.get("set_number"))
    
    # ========================================
    # Check boxes for selected interrogatories using native PDF form fields
    # ========================================
    selected_sections = data.get("selected_sections", [])
    print(f"\nChecking {len(selected_sections)} interrogatory sections using native PDF checkboxes...")
    
    # Build a list of checkbox field name patterns to match
    checkbox_patterns = []
    for section in selected_sections:
        section_str = str(section)
        if section_str in UI_TO_CHECKBOX_FIELD:
            checkbox_patterns.append((section_str, UI_TO_CHECKBOX_FIELD[section_str]))
        else:
            print(f"  Warning: No checkbox field mapping for section {section_str}")
    
    # Find and check all matching checkbox widgets across all pages
    checked_count = 0
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        for widget in page.widgets():
            if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                field_name = widget.field_name
                
                # Check if this widget matches any of our patterns
                for ui_section, pattern in checkbox_patterns:
                    if pattern in field_name:
                        # Check the checkbox by setting its value
                        widget.field_value = True
                        widget.update()
                        print(f"  Checked UI:{ui_section} -> field \"{field_name[:60]}...\" on page {page_idx + 1}")
                        checked_count += 1
                        break  # Only match once per widget
    
    print(f"  Total checkboxes checked: {checked_count}")
    
    # Save the filled PDF
    doc.save(output_path)
    doc.close()
    print(f"\nSaved filled PDF to: {output_path}")
    return output_path


def main():
    """Main entry point"""
    # Check if JSON data is provided via stdin or argument
    if len(sys.argv) > 1:
        # Read from file
        with open(sys.argv[1], 'r') as f:
            data = json.load(f)
        output_path = sys.argv[2] if len(sys.argv) > 2 else "filled_disc001.pdf"
    else:
        # Test data using UI interrogatory numbers
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
            # Using UI interrogatory numbers (will be mapped to DISC-001 sections)
            "selected_sections": [
                "1",      # Identity -> 1.0
                "2",      # Name -> 2.1
                "3",      # Business -> 2.2
                "4",      # Birthdate -> 2.3
                "6.1",    # Personal Injury - Injuries
                "6.2",    # Personal Injury - Incident
                "6.3",    # Personal Injury - Description
                "6.5",    # Personal Injury - Witnesses
                "6.6",    # Personal Injury - Health care
                "17",     # Insurance -> 4.1
            ]
        }
        output_path = "test-disc001-pymupdf.pdf"
    
    fill_disc001(data, output_path)


if __name__ == "__main__":
    main()
