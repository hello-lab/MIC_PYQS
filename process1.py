import os
import re
import fitz  # PyMuPDF
import cv2
import numpy as np
import easyocr
import logging
import warnings

# Suppress PyTorch and EasyOCR warnings (hides the NPU/CUDA warning)
warnings.filterwarnings("ignore", category=UserWarning, module="torch")
logging.getLogger('easyocr').setLevel(logging.ERROR)

PDF_DIR = "downloaded_pdfs"

print("Loading EasyOCR model (this takes a moment)...")
reader = easyocr.Reader(['en'], gpu=False, verbose=False)
print("Model loaded.\n")

def parse_filename(filename):
    """Slices the filename based on Exam and Slot markers to perfectly capture metadata."""
    name_without_ext = filename.replace(".pdf", "")
    metadata = {
        "subject": "UnknownSubject",
        "exam": "UnknownExam",
        "year": "UnknownYear",
        "slot": "NoSlot",
        "short_id": "0000"
    }

    exam_match = re.search(r'_(CAT_1|CAT_2|FAT)_', name_without_ext, re.IGNORECASE)
    if exam_match:
        metadata["exam"] = exam_match.group(1).upper()
        metadata["subject"] = name_without_ext[:exam_match.start()].upper()
        rest_after_exam = name_without_ext[exam_match.end():]
    else:
        rest_after_exam = name_without_ext

    slot_match = re.search(r'Slot_([A-Za-z0-9]+)', rest_after_exam, re.IGNORECASE)
    if slot_match:
        metadata["slot"] = slot_match.group(1).upper()
        year_str = rest_after_exam[:slot_match.start()].strip("_")
        if year_str:
            metadata["year"] = year_str
            
    id_match = re.search(r'_([a-f0-9]{8})$', rest_after_exam, re.IGNORECASE)
    if id_match:
        metadata["short_id"] = id_match.group(1).lower()

    if metadata["year"] == "UnknownYear":
        fallback_match = re.search(r'(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|WINTER|SUMMER|FALL|SPRING)[A-Z_]*(\d{4}|\d{2})', filename, re.IGNORECASE)
        if fallback_match:
            metadata["year"] = fallback_match.group(1)

    return metadata

def is_valid_subject(subject):
    """Validates if a subject looks like a real course code (e.g., BCSE302L)."""
    return bool(re.match(r'^[A-Z]{3,6}\d{3,4}[A-Z]?$', subject, re.IGNORECASE))

def parse_metadata(text, metadata):
    """Uses Regex to find ONLY the missing fields in the extracted text."""
    
    # 1. Aggressive Year Extraction
    if metadata["year"] == "UnknownYear":
        text_for_year = text.replace('O', '0').replace('o', '0').replace('l', '1').replace('I', '1')
        y_match1 = re.search(r'(20[1-9]\d)\s*[-/]\s*(20\d{2}|\d{2})', text_for_year)
        y_match2 = re.search(r'\b(\d{2})\s*[-/]\s*(\d{2})\b', text_for_year)
        y_match3 = re.search(r'\b(20[1-9]\d)\b', text_for_year)

        if y_match1:
            metadata["year"] = f"{y_match1.group(1)}-{y_match1.group(2)}"
        elif y_match2:
            metadata["year"] = f"{y_match2.group(1)}-{y_match2.group(2)}"
        elif y_match3:
            metadata["year"] = y_match3.group(1)
            
    # 2. Extract Subject Code
    if metadata["subject"] == "UnknownSubject" or not is_valid_subject(metadata["subject"]):
        matches = re.finditer(r'\b([A-Z]{3,6})\s*(\d{3,4}[A-Z]?)\b', text, re.IGNORECASE)
        blocklist = {
            "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", 
            "AUGUST", "WINTER", "SUMMER", "FALL", "SPRING", "PULLEY", "TERM", "YEAR", "PAGE", "TIME", "MARK"
        }
        real_subject = None
        for match in matches:
            letters = match.group(1).upper()
            if letters not in blocklist:
                real_subject = (match.group(1) + match.group(2)).upper().replace(" ", "")
                break
        
        if real_subject:
            metadata["subject"] = real_subject
            print(f"      [*] Found real subject inside PDF: {metadata['subject']}")
        else:
            metadata["subject"] = "UnknownSubject"
            
    # 3. Extract Exam Type
    if metadata["exam"] == "UnknownExam":
        if re.search(r'\bFAT\b', text, re.IGNORECASE):
            metadata["exam"] = "FAT"
        elif re.search(r'CAT\s*-?\s*1', text, re.IGNORECASE):
            metadata["exam"] = "CAT_1"
        elif re.search(r'CAT\s*-?\s*2', text, re.IGNORECASE):
            metadata["exam"] = "CAT_2"

    # 4. Extract Slot
    if metadata["slot"] == "NoSlot" or len(metadata["slot"]) > 8 or metadata["slot"] in ["DURATION", "SLOT"]:
        slot_match = re.search(r'SLOT\s*[\n\r]*\s*[:-]?\s*([A-Z0-9\+]{2,8})', text, re.IGNORECASE)
        if slot_match:
            metadata["slot"] = slot_match.group(1).upper()
            print(f"      [*] Found real slot inside PDF: {metadata['slot']}")
            
    return metadata

def sanitize_filename(text):
    if not text:
        return "Unknown"
    cleaned = re.sub(r"[^\w\-.]", "_", str(text))
    return re.sub(r"_+", "_", cleaned).strip("_")

def main():
    if not os.path.exists(PDF_DIR):
        print(f"Error: Directory '{PDF_DIR}' not found.")
        return

    files = [f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")]
    total_files = len(files)
    print(f"Found {total_files} PDFs to scan.\n")

    for index, filename in enumerate(files, start=1):
        metadata = parse_filename(filename)
        
        has_unknowns = any(
            val in ["UnknownSubject", "UnknownExam", "UnknownYear", "NoSlot"] 
            for val in metadata.values()
        )
        valid_subject = is_valid_subject(metadata["subject"])
        
        needs_deep_clean = has_unknowns or not valid_subject
        
        if needs_deep_clean:
            print(f"[{index}/{total_files}] Deep Cleaning: {filename}")
            file_path = os.path.join(PDF_DIR, filename)
            
            # Read through the PDF page by page
            try:
                doc = fitz.open(file_path)
                for page_num in range(len(doc)):
                    
                    # Check if we still have missing data. If not, stop reading pages!
                    has_missing_data = any(val in ["UnknownSubject", "UnknownExam", "UnknownYear", "NoSlot"] for val in metadata.values())
                    if not has_missing_data and is_valid_subject(metadata["subject"]):
                        break
                        
                    page = doc[page_num]
                    page_text = page.get_text()
                    
                    is_garbage_text = not any(keyword in page_text.upper() for keyword in ["VIT", "TEST", "COURSE", "SLOT", "SEMESTER", "MARK", "TIME", "PROGRAMME"])
                    
                    if len(page_text.strip()) < 50 or is_garbage_text:
                        print(f"      [*] Page {page_num + 1}: Image/Garbage detected. Running EasyOCR...")
                        pix = page.get_pixmap(dpi=300)
                        img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                        
                        if pix.n == 3:
                            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                        elif pix.n == 4:
                            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
                        
                        result = reader.readtext(img_array, detail=0)
                        page_text = "\n".join(result)
                        
                    # Parse the text found on this specific page
                    metadata = parse_metadata(page_text, metadata)
                    
                doc.close()
            except Exception as e:
                print(f"      [!] PDF read error: {e}")

        safe_subject = sanitize_filename(metadata["subject"])
        safe_exam = sanitize_filename(metadata["exam"])
        safe_year = sanitize_filename(metadata["year"])
        safe_slot = sanitize_filename(metadata["slot"])
        
        if metadata["short_id"] == "0000":
            new_filename = f"{safe_subject}_{safe_exam}_{safe_year}_Slot_{safe_slot}.pdf"
        else:
            new_filename = f"{safe_subject}_{safe_exam}_{safe_year}_Slot_{safe_slot}_{metadata['short_id']}.pdf"
        
        if filename == new_filename:
            if not needs_deep_clean:
                print(f"[{index}/{total_files}] Skipping: {filename} (Already perfect)")
            continue
            
        if not needs_deep_clean:
            print(f"[{index}/{total_files}] Formatting: {filename}")
        
        file_path = os.path.join(PDF_DIR, filename)
        new_filepath = os.path.join(PDF_DIR, new_filename)

        base_name, extension = os.path.splitext(new_filename)
        counter = 1
        
        while os.path.exists(new_filepath) and new_filepath != file_path:
            new_filename = f"{base_name}_{counter}{extension}"
            new_filepath = os.path.join(PDF_DIR, new_filename)
            counter += 1
        
        if new_filepath != file_path:
            os.rename(file_path, new_filepath)
            print(f"      [+] Renamed to: {new_filename}")

    print("\nFilename standardization and deep clean complete!")

if __name__ == "__main__":
    main()