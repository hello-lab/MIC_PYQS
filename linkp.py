import json
import re
import pandas as pd

def parse_filename(filename):
    """
    Extracts course_code, exam_type, year, and slot from standard test paper filenames.
    """
    basename = filename.replace('.pdf', '')
    
    # Regex pattern matching standard naming structure:
    # [CourseCode]_[ExamType]_[Year]_Slot_[SlotCode]
    pattern = r'^([A-Z0-9]+)_([A-Z0-9_]+?)_(\d{4}(?:[-_]\d{2,4})?|UnknownYear)_Slot_(.+)$'
    match = re.match(pattern, basename, re.IGNORECASE)
    
    if match:
        course_code, exam_type, year, slot = match.groups()
        return {
            "course_code": course_code.upper(),
            "exam_type": exam_type.replace('_', ' ').strip().upper(),
            "year": year,
            "slot": slot.upper()
        }
    else:
        # Fallback for non-standard formats
        parts = basename.split('_')
        return {
            "course_code": parts[0].upper() if len(parts) > 0 else None,
            "exam_type": " ".join(parts[1:-2]).replace('_', ' ').upper() if len(parts) > 3 else None,
            "year": parts[-2] if len(parts) > 2 else None,
            "slot": parts[-1].upper() if len(parts) > 0 else None
        }

def export_to_excel(input_json_path="file.json", output_excel_path="file_metadata.xlsx"):
    # Load input files
    with open(input_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    for idx, item in enumerate(data, start=1):
        filename = item.get("filename", "")
        link = item.get("link", "")
        
        meta = parse_filename(filename)
        
        rows.append({
            "ID": idx,
            "Filename": filename,
            "Course Code": meta.get("course_code"),
            "Exam Type": meta.get("exam_type"),
            "Academic Year": meta.get("year"),
            "Slot": meta.get("slot"),
            "Download Link": link
        })

    # Create DataFrame and Export to Excel
    df = pd.DataFrame(rows)
    df.to_excel(output_excel_path, index=False, engine='openpyxl')

    print(f"Successfully processed {len(rows)} entries.")
    print(f"Exported to Excel: '{output_excel_path}'")

if __name__ == "__main__":
    export_to_excel()