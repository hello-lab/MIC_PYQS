import json
import os
import re
import time
import requests

HISTORY_FILE = "download_history.txt"

def load_history():
    """Loads the set of previously downloaded file IDs from a text file."""
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return set(line.strip() for line in f if line.strip())
    return set()

def save_to_history(file_id):
    """Appends a successfully downloaded file ID to the history log."""
    if file_id:
        with open(HISTORY_FILE, "a", encoding="utf-8") as f:
            f.write(file_id + "\n")

def extract_file_id(wix_uri):
    """Extracts the unique file ID hash from a Wix document URI."""
    if not wix_uri or not wix_uri.startswith("wix:document://"):
        return None
    parts = wix_uri.replace("wix:document://", "").split("/")
    if len(parts) >= 2:
        return parts[1]
    return None

def wix_uri_to_download_url(wix_uri):
    """Converts a Wix internal document URI to a public static download URL."""
    file_id = extract_file_id(wix_uri)
    if file_id:
        return f"https://static.wixstatic.com/ugd/{file_id}"
    return None

def sanitize_filename(text):
    """Removes or replaces characters that are illegal in file names."""
    if not text:
        return "Unknown"
    cleaned = re.sub(r"[^\w\-.]", "_", str(text))
    return re.sub(r"_+", "_", cleaned).strip("_")

def main():
    json_files = ["data1.json", "data2.json"]
    all_data_items = []

    for json_filename in json_files:
        if not os.path.exists(json_filename):
            print(f"Warning: '{json_filename}' not found. Skipping...")
            continue

        print(f"Loading data from {json_filename}...")
        try:
            with open(json_filename, "r", encoding="utf-8") as f:
                data = json.load(f)
                items = data.get("dataItems", [])
                all_data_items.extend(items)
                print(f"-> Loaded {len(items)} items from {json_filename}")
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON in {json_filename}: {e}")

    total_items = len(all_data_items)
    if total_items == 0:
        print("Error: No data items found. Check your JSON files.")
        return

    print(f"\nTotal items to process: {total_items}")

    output_dir = "downloaded_pdfs"
    os.makedirs(output_dir, exist_ok=True)

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
    }

    # 1. Load history from previous script runs
    downloaded_history = load_history()
    print(f"Loaded {len(downloaded_history)} previously downloaded files from history.")

    seen_ids = set()
    seen_signatures = set()

    for index, item in enumerate(all_data_items, start=1):
        item_data = item.get("data", {})
        progress_prefix = f"[{index}/{total_items}]"

        item_id = item.get("id") or item_data.get("_id")
        job_type = item_data.get("jobType", "UnknownSubject")
        job_type1 = item_data.get("jobType1", "UnknownExam")
        order = item_data.get("order", "UnknownYear")
        slot = item_data.get("slot", "NoSlot")
        paper_uri = item_data.get("paperPdf", "")

        file_id = extract_file_id(paper_uri)

        # -------------------------------------------------------------
        # DUPLICATE CHECK 1: Has this exact file been downloaded before?
        # -------------------------------------------------------------
        if file_id and file_id in downloaded_history:
            print(f"{progress_prefix} Skipping (Found in download history): {file_id[:8]}...")
            continue

        # -------------------------------------------------------------
        # DUPLICATE CHECK 2: Internal Script Memory (prevent dupes in current JSON)
        # -------------------------------------------------------------
        if item_id and item_id in seen_ids:
            continue
        seen_ids.add(item_id)

        item_signature = (job_type, job_type1, order, slot, file_id or paper_uri)
        if item_signature in seen_signatures:
            continue
        seen_signatures.add(item_signature)

        download_url = wix_uri_to_download_url(paper_uri)
        if not download_url:
            print(f"{progress_prefix} Skipping: Invalid URI for {job_type}")
            continue

        # -------------------------------------------------------------
        # DUPLICATE CHECK 3: Check Disk for Old & New Filename Formats
        # -------------------------------------------------------------
        safe_subject = sanitize_filename(job_type)
        safe_exam = sanitize_filename(job_type1)
        safe_year = sanitize_filename(order)
        safe_slot = sanitize_filename(slot)
        short_id = sanitize_filename(item_id[:8] if item_id else file_id[:8] if file_id else "0000")

        new_filename = f"{safe_subject}_{safe_exam}_{safe_year}_Slot_{safe_slot}_{short_id}.pdf"
        old_filename = f"{safe_subject}_{safe_exam}_Slot_{safe_slot}.pdf"

        new_file_path = os.path.join(output_dir, new_filename)
        old_file_path = os.path.join(output_dir, old_filename)

        if os.path.exists(new_file_path) or os.path.exists(old_file_path):
            print(f"{progress_prefix} Skipping (File already on disk).")
            save_to_history(file_id) # Save it so we don't even check the disk next time
            downloaded_history.add(file_id)
            continue

        # -------------------------------------------------------------
        # DOWNLOAD PDF
        # -------------------------------------------------------------
        print(f"{progress_prefix} Downloading [{new_filename}]...")
        try:
            pdf_response = requests.get(download_url, headers=headers)
            if pdf_response.status_code == 200:
                with open(new_file_path, "wb") as f:
                    f.write(pdf_response.content)
                print(f"{progress_prefix} Successfully saved.")
                
                # 2. Save the successful download to the history file
                save_to_history(file_id)
                downloaded_history.add(file_id)
            else:
                print(f"{progress_prefix} Failed download (Status: {pdf_response.status_code})")
        except Exception as e:
            print(f"{progress_prefix} Error downloading: {e}")

        time.sleep(1)

    print("\nAll tasks completed!")

if __name__ == "__main__":
    main()