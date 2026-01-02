#!/usr/bin/env python3
"""
Analyze DISC-002 PDF to discover field names and positions
"""

import fitz  # PyMuPDF
import json
from urllib.request import urlopen

DISC002_URL = "https://courts.ca.gov/sites/default/files/courts/default/2024-11/disc002.pdf"

def analyze_disc002():
    """Download and analyze the DISC-002 PDF structure"""
    print(f"Downloading DISC-002 from {DISC002_URL}...")
    with urlopen(DISC002_URL) as response:
        pdf_bytes = response.read()
    
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    print(f"Loaded PDF with {len(doc)} pages")
    print(f"Page size: {doc[0].rect.width} x {doc[0].rect.height}")
    
    all_widgets = []
    checkboxes = []
    text_fields = []
    
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        print(f"\n{'='*60}")
        print(f"PAGE {page_idx + 1}")
        print(f"{'='*60}")
        
        for widget in page.widgets():
            field_name = widget.field_name or ""
            field_type = widget.field_type
            field_type_name = {
                0: "UNKNOWN",
                1: "BUTTON",
                2: "CHECKBOX", 
                3: "RADIOBUTTON",
                4: "TEXT",
                5: "LISTBOX",
                6: "COMBOBOX",
                7: "SIGNATURE"
            }.get(field_type, f"TYPE_{field_type}")
            
            rect = widget.rect
            
            widget_info = {
                "page": page_idx + 1,
                "name": field_name,
                "type": field_type_name,
                "type_id": field_type,
                "rect": {
                    "x0": round(rect.x0, 1),
                    "y0": round(rect.y0, 1),
                    "x1": round(rect.x1, 1),
                    "y1": round(rect.y1, 1)
                },
                "value": widget.field_value
            }
            
            all_widgets.append(widget_info)
            
            if field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                checkboxes.append(widget_info)
                print(f"  CHECKBOX: {field_name[:80]}")
                print(f"    Rect: ({rect.x0:.1f}, {rect.y0:.1f}) to ({rect.x1:.1f}, {rect.y1:.1f})")
            elif field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                text_fields.append(widget_info)
                print(f"  TEXT: {field_name[:80]}")
                print(f"    Rect: ({rect.x0:.1f}, {rect.y0:.1f}) to ({rect.x1:.1f}, {rect.y1:.1f})")
    
    doc.close()
    
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Total widgets: {len(all_widgets)}")
    print(f"Checkboxes: {len(checkboxes)}")
    print(f"Text fields: {len(text_fields)}")
    
    # Output checkbox patterns for easy mapping
    print(f"\n{'='*60}")
    print("CHECKBOX FIELD NAMES (for mapping)")
    print(f"{'='*60}")
    for cb in checkboxes:
        print(f'    "{cb["name"]}": "???",  # Page {cb["page"]}, y={cb["rect"]["y0"]}')
    
    # Output text field positions
    print(f"\n{'='*60}")
    print("TEXT FIELD POSITIONS (for coordinates)")
    print(f"{'='*60}")
    for tf in text_fields:
        print(f'    # {tf["name"][:50]}')
        print(f'    # Rect: x0={tf["rect"]["x0"]}, y0={tf["rect"]["y0"]}, x1={tf["rect"]["x1"]}, y1={tf["rect"]["y1"]}')
    
    # Save to JSON for reference
    output = {
        "total_widgets": len(all_widgets),
        "checkboxes": checkboxes,
        "text_fields": text_fields
    }
    
    with open("disc002_fields.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved field data to disc002_fields.json")
    
    return output

if __name__ == "__main__":
    analyze_disc002()
