import json
import os
import requests


def wix_uri_to_download_url(wix_uri):
  """Converts a Wix internal document URI to a public static download URL."""
  if not wix_uri or not wix_uri.startswith("wix:document://"):
    return None
  # Format: wix:document://v1/<file_id>/<file_name>
  parts = wix_uri.replace("wix:document://", "").split("/")
  if len(parts) >= 2:
    file_id = parts[1]
    return f"https://static.wixstatic.com/ugd/{file_id}"
  return None


def main():
  # List of JSON files to process
  json_files = ["data1.json", "data2.json"]
  all_data_items = []

  # Load and aggregate data from all provided JSON files
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

  if not all_data_items:
    print(
        "Error: No data items found across the files. Make sure 'data1.json'"
        " and 'data2.json' exist and contain valid data."
    )
    return

  print(f"\nTotal items to process: {len(all_data_items)}")

  # Create a directory to store downloaded PDFs
  output_dir = "downloaded_pdfs1"
  os.makedirs(output_dir, exist_ok=True)

  headers = {
      "User-Agent": (
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      )
  }

  for index, item in enumerate(all_data_items):
    item_data = item.get("data", {})

    job_type = item_data.get("jobType", "UnknownJob")  # e.g., BEEE307L
    job_type1 = item_data.get("jobType1", "UnknownType")  # e.g., CAT 2 / FAT
    slot = item_data.get("slot", "NoSlot")  # e.g., B1
    paper_uri = item_data.get("paperPdf", "")

    download_url = wix_uri_to_download_url(paper_uri)
    if not download_url:
      print(f"[{index+1}] Skipping: Invalid or missing paperPdf URI.")
      continue

    # Construct a clean, labeled filename
    safe_job_type = job_type.replace(" ", "_")
    safe_job_type1 = job_type1.replace(" ", "_")
    safe_slot = slot.replace(" ", "_")
    filename = f"{safe_job_type}_{safe_job_type1}_Slot_{safe_slot}.pdf"
    file_path = os.path.join(output_dir, filename)

    print(f"Downloading [{filename}]...")
    try:
      pdf_response = requests.get(download_url, headers=headers)
      if pdf_response.status_code == 200:
        with open(file_path, "wb") as f:
          f.write(pdf_response.content)
        print(f"Successfully saved: {file_path}")
      else:
        print(
            f"Failed to download PDF from {download_url} (Status:"
            f" {pdf_response.status_code})"
        )
    except Exception as e:
      print(f"Error downloading {filename}: {e}")


if __name__ == "__main__":
  main()