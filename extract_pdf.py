#!/usr/bin/env python3
"""
Extract images from PDF using macOS built-in tools
"""
import subprocess
import os
import sys

def extract_pdf_pages(pdf_path, output_dir):
    """Extract pages from PDF using macOS tools"""
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Use qlmanage to extract pages
        cmd = [
            'qlmanage', '-t', '-s', '2000', '-o', output_dir, pdf_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"Successfully extracted pages to {output_dir}")
            # List extracted files
            files = os.listdir(output_dir)
            for file in files:
                if file.endswith('.png'):
                    print(f"  - {file}")
        else:
            print(f"Error extracting pages: {result.stderr}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    pdf_file = "assets/FILE_4543.pdf"
    output_dir = "assets/extracted"
    
    if os.path.exists(pdf_file):
        extract_pdf_pages(pdf_file, output_dir)
    else:
        print(f"PDF file not found: {pdf_file}")
