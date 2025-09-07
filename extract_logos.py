#!/usr/bin/env python3
"""
Automated Logo Extraction and Processing System
Extracts logos from PDF brand guidelines and processes them for web use
"""

import os
import sys
import subprocess
import json
from pathlib import Path
import shutil

class LogoExtractor:
    def __init__(self, pdf_path, output_dir="assets/logos"):
        self.pdf_path = pdf_path
        self.output_dir = Path(output_dir)
        self.pages_dir = self.output_dir / "pages"
        self.processed_dir = self.output_dir / "processed"
        self.final_dir = self.output_dir / "final"
        
        # Create directory structure
        for dir_path in [self.pages_dir, self.processed_dir, self.final_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def extract_pdf_pages(self):
        """Extract all pages from PDF as high-resolution images"""
        print("📄 Extracting PDF pages...")
        
        # Try multiple extraction methods
        methods = [
            self._extract_with_qlmanage,
            self._extract_with_sips,
            self._extract_with_preview
        ]
        
        for method in methods:
            try:
                if method():
                    print(f"✅ Successfully extracted pages using {method.__name__}")
                    return True
            except Exception as e:
                print(f"❌ {method.__name__} failed: {e}")
                continue
        
        print("❌ All extraction methods failed")
        return False
    
    def _extract_with_qlmanage(self):
        """Extract pages using qlmanage (macOS)"""
        cmd = ['qlmanage', '-t', '-s', '3000', '-o', str(self.pages_dir), self.pdf_path]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0
    
    def _extract_with_sips(self):
        """Extract pages using sips (macOS)"""
        # Convert PDF to images using sips
        output_pattern = str(self.pages_dir / "page_%d.png")
        cmd = ['sips', '-s', 'format', 'png', self.pdf_path, '--out', output_pattern]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0
    
    def _extract_with_preview(self):
        """Extract using Preview command line"""
        # This is a fallback method
        return False
    
    def detect_logo_regions(self):
        """Detect potential logo regions in extracted images"""
        print("🔍 Detecting logo regions...")
        
        # For now, we'll use a simple approach
        # In a full implementation, you'd use OpenCV or similar
        logo_regions = []
        
        for page_file in self.pages_dir.glob("*.png"):
            print(f"  Processing {page_file.name}")
            # This is where we'd implement logo detection
            # For now, we'll create placeholder regions
            logo_regions.append({
                'page': page_file.name,
                'regions': [
                    {'x': 100, 'y': 100, 'width': 300, 'height': 100, 'type': 'main_logo'},
                    {'x': 200, 'y': 300, 'width': 150, 'height': 150, 'type': 'icon'},
                ]
            })
        
        return logo_regions
    
    def crop_logos(self, logo_regions):
        """Crop detected logo regions"""
        print("✂️ Cropping logo regions...")
        
        for page_data in logo_regions:
            page_file = self.pages_dir / page_data['page']
            
            for i, region in enumerate(page_data['regions']):
                output_file = self.processed_dir / f"{page_data['page']}_logo_{i}_{region['type']}.png"
                
                # Use sips to crop the region
                cmd = [
                    'sips', '-c', str(region['height']), str(region['width']),
                    '-z', str(region['y']), str(region['x']),
                    str(page_file), '--out', str(output_file)
                ]
                
                try:
                    subprocess.run(cmd, check=True, capture_output=True)
                    print(f"  ✅ Cropped {output_file.name}")
                except subprocess.CalledProcessError as e:
                    print(f"  ❌ Failed to crop {output_file.name}: {e}")
    
    def optimize_logos(self):
        """Optimize logos for web use"""
        print("🎨 Optimizing logos for web use...")
        
        for logo_file in self.processed_dir.glob("*.png"):
            # Create different sizes
            sizes = [
                (1000, "large"),
                (500, "medium"),
                (200, "small")
            ]
            
            for size, suffix in sizes:
                output_file = self.final_dir / f"{logo_file.stem}_{suffix}.png"
                
                # Resize using sips
                cmd = ['sips', '-Z', str(size), str(logo_file), '--out', str(output_file)]
                
                try:
                    subprocess.run(cmd, check=True, capture_output=True)
                    print(f"  ✅ Created {output_file.name}")
                except subprocess.CalledProcessError as e:
                    print(f"  ❌ Failed to optimize {output_file.name}: {e}")
    
    def create_white_versions(self):
        """Create white/inverted versions of logos"""
        print("⚪ Creating white versions...")
        
        for logo_file in self.final_dir.glob("*_large.png"):
            white_file = self.final_dir / f"{logo_file.stem.replace('_large', '')}_white_large.png"
            
            # Use sips to invert colors
            cmd = ['sips', '-i', str(logo_file), '--out', str(white_file)]
            
            try:
                subprocess.run(cmd, check=True, capture_output=True)
                print(f"  ✅ Created white version: {white_file.name}")
            except subprocess.CalledProcessError as e:
                print(f"  ❌ Failed to create white version: {e}")
    
    def generate_web_assets(self):
        """Generate final web-ready assets"""
        print("🌐 Generating web assets...")
        
        # Copy main logo to images directory
        main_logos = list(self.final_dir.glob("*main_logo*large.png"))
        if main_logos:
            shutil.copy2(main_logos[0], "images/client-logo.png")
            print("  ✅ Created images/client-logo.png")
        
        # Copy white logo
        white_logos = list(self.final_dir.glob("*white*large.png"))
        if white_logos:
            shutil.copy2(white_logos[0], "images/client-logo-white.png")
            print("  ✅ Created images/client-logo-white.png")
        
        # Copy icon
        icons = list(self.final_dir.glob("*icon*large.png"))
        if icons:
            shutil.copy2(icons[0], "images/client-icon.png")
            print("  ✅ Created images/client-icon.png")
    
    def run_extraction(self):
        """Run the complete extraction process"""
        print("🚀 Starting automated logo extraction...")
        
        if not os.path.exists(self.pdf_path):
            print(f"❌ PDF file not found: {self.pdf_path}")
            return False
        
        # Step 1: Extract pages
        if not self.extract_pdf_pages():
            return False
        
        # Step 2: Detect logo regions
        logo_regions = self.detect_logo_regions()
        
        # Step 3: Crop logos
        self.crop_logos(logo_regions)
        
        # Step 4: Optimize logos
        self.optimize_logos()
        
        # Step 5: Create white versions
        self.create_white_versions()
        
        # Step 6: Generate web assets
        self.generate_web_assets()
        
        print("✅ Logo extraction complete!")
        print(f"📁 Check the following directories:")
        print(f"  - {self.pages_dir} (extracted pages)")
        print(f"  - {self.processed_dir} (cropped logos)")
        print(f"  - {self.final_dir} (optimized logos)")
        print(f"  - images/ (web-ready assets)")
        
        return True

def main():
    pdf_path = "assets/FILE_4543.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return
    
    extractor = LogoExtractor(pdf_path)
    extractor.run_extraction()

if __name__ == "__main__":
    main()
