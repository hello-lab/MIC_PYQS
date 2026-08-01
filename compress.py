import os
import pikepdf

INPUT_DIR = "downloaded_pdfs"
OUTPUT_DIR = "compressed_pdfs"

def get_size_mb(filepath):
    """Returns the size of a file in Megabytes."""
    return os.path.getsize(filepath) / (1024 * 1024)

def main():
    if not os.path.exists(INPUT_DIR):
        print(f"Error: Directory '{INPUT_DIR}' not found.")
        return

    # Create the output directory if it doesn't exist
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    files = [f for f in os.listdir(INPUT_DIR) if f.endswith(".pdf")]
    total_files = len(files)
    
    if total_files == 0:
        print(f"No PDFs found in {INPUT_DIR}.")
        return

    print(f"Found {total_files} PDFs. Running Lossless QPDF Compression...\n")
    print("-" * 60)
    
    total_original_size = 0
    total_compressed_size = 0

    for index, filename in enumerate(files, start=1):
        input_path = os.path.join(INPUT_DIR, filename)
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        orig_size = get_size_mb(input_path)
        total_original_size += orig_size
        
        print(f"[{index}/{total_files}] Processing: {filename} ({orig_size:.2f} MB)")
        
        try:
            # Open the PDF using pikepdf (QPDF engine)
            with pikepdf.Pdf.open(input_path) as pdf:
                # Save with maximum lossless structural compression
                # object_stream_mode=generate: Packs multiple PDF objects into compressed streams
                # compress_streams=True: Applies FlateDecode (Zip) compression to all streams
                pdf.save(
                    output_path,
                    compress_streams=True,
                    object_stream_mode=pikepdf.ObjectStreamMode.generate
                )
            
            new_size = get_size_mb(output_path)
            total_compressed_size += new_size
            
            savings = ((orig_size - new_size) / orig_size) * 100 if orig_size > 0 else 0
            
            if savings > 0:
                print(f"      [+] Success! New Size: {new_size:.2f} MB (-{savings:.1f}%)")
            elif savings < 0:
                # Very rarely, re-encoding can slightly increase size if the original was broken
                print(f"      [-] Size increased slightly to {new_size:.2f} MB. (Structure rebuilt)")
            else:
                print(f"      [-] Already fully optimized. Kept at {new_size:.2f} MB")
                
        except pikepdf.PdfError as e:
            print(f"      [!] PDF structure error in {filename}: {e}")
        except Exception as e:
            print(f"      [!] Unexpected error compressing {filename}: {e}")

    print("\n" + "=" * 60)
    print("Lossless Compression Complete!")
    print(f"Total Original Size  : {total_original_size:.2f} MB")
    print(f"Total Compressed Size: {total_compressed_size:.2f} MB")
    
    if total_original_size > 0:
        total_savings_mb = total_original_size - total_compressed_size
        total_savings_pct = (total_savings_mb / total_original_size) * 100
        print(f"Overall Space Saved  : {total_savings_mb:.2f} MB ({total_savings_pct:.1f}%)")
    print("=" * 60)

if __name__ == "__main__":
    main()