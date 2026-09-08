import os
import sys
import json
import argparse
import shutil

def main():
    parser = argparse.ArgumentParser(description="Rewrite remote vinsho.in image URLs in JSON data files to local paths.")
    parser.add_argument("--data", default=".", help="Path to data folder containing JSON files")
    parser.add_argument("--prefix", default="/images/vinsho", help="Local URL prefix")
    args = parser.parse_args()

    data_dir = os.path.abspath(args.data)
    manifest_path = os.path.join("scratch", "image_manifest.json")

    if not os.path.exists(manifest_path):
        print(f"Error: Manifest file {manifest_path} not found.")
        sys.exit(1)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    json_files = [
        "vinsho-content.json",
        "vinsho-commerce-seed.json",
        "vinsho-taxonomy.json",
        "vinsho-about-content.json"
    ]

    total_rewritten = 0
    rewritten_counts = {}

    for file_name in json_files:
        file_path = os.path.join(data_dir, file_name)
        if not os.path.exists(file_path):
            print(f"Warning: File {file_path} does not exist.")
            continue

        # Create .bak backup
        bak_path = file_path + ".bak"
        shutil.copyfile(file_path, bak_path)

        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        file_rewritten_count = 0
        for remote_url, local_path in manifest.items():
            if remote_url in content:
                count = content.count(remote_url)
                content = content.replace(remote_url, local_path)
                file_rewritten_count += count

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        rewritten_counts[file_name] = file_rewritten_count
        total_rewritten += file_rewritten_count
        print(f"{file_name}: {file_rewritten_count} URLs rewritten (backup saved to {os.path.basename(bak_path)})")

    print("\n=== REWRITE SUMMARY ===")
    print(f"Total rewritten: {total_rewritten}")
    if total_rewritten != 172:
        print(f"Note: Total rewritten count is {total_rewritten}.")

if __name__ == "__main__":
    main()
