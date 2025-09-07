#!/usr/bin/env python3
"""
Hard Feelings Tacos Logo Replacement Script
Replaces all current logos with the new Hard Feelings Tacos Logo files
"""

import os
import shutil
from pathlib import Path

class HardFeelingsLogoReplacer:
    def __init__(self):
        self.html_files = [
            "index.html",
            "menu.html", 
            "about-us.html",
            "401.html",
            "404.html",
            "detail_thali-menu.html",
            "detail_upcoming-events.html",
            "reference/changelog.html",
            "reference/dls.html",
            "reference/license.html"
        ]
        
        # Source logo files
        self.source_logos = {
            "main": "assets/logos/icons/Hard Feelings Tacos Logo (1).png",
            "white": "assets/logos/icons/Hard Feelings Tacos Logo (2).png"
        }
        
        # Target locations
        self.target_logos = {
            "main": "images/hard-feelings-logo.png",
            "white": "images/hard-feelings-logo-white.png"
        }
    
    def copy_logo_files(self):
        """Copy the Hard Feelings Tacos logos to the images directory"""
        print("📁 Copying Hard Feelings Tacos logos...")
        
        for logo_type, source_path in self.source_logos.items():
            target_path = self.target_logos[logo_type]
            
            if os.path.exists(source_path):
                shutil.copy2(source_path, target_path)
                print(f"✅ Copied {source_path} → {target_path}")
            else:
                print(f"❌ Source logo not found: {source_path}")
                return False
        
        return True
    
    def replace_logos_in_file(self, file_path):
        """Replace logo references in a single HTML file"""
        if not os.path.exists(file_path):
            print(f"⚠️  File not found: {file_path}")
            return False
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Replace all possible logo references
            logo_replacements = {
                "client-logo.png": "hard-feelings-logo.png",
                "client-logo-white.png": "hard-feelings-logo-white.png",
                "thali-logo.svg": "hard-feelings-logo.png",
                "thali-logo-white.svg": "hard-feelings-logo-white.png"
            }
            
            for old_logo, new_logo in logo_replacements.items():
                content = content.replace(old_logo, new_logo)
            
            # Only write if content changed
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Updated {file_path}")
                return True
            else:
                print(f"ℹ️  No changes needed in {file_path}")
                return False
                
        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")
            return False
    
    def update_css_styles(self):
        """Update CSS to ensure proper logo sizing for Hard Feelings Tacos"""
        css_file = "css/hard-feelings-tacos.webflow.css"
        
        if not os.path.exists(css_file):
            print(f"⚠️  CSS file not found: {css_file}")
            return
        
        try:
            with open(css_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add/update CSS rules for Hard Feelings Tacos logos
            logo_css = """
/* Hard Feelings Tacos Logo Styles */
.nav-logo img,
.logo-footer img {
    max-height: 60px;
    width: auto;
    object-fit: contain;
}

@media (max-width: 768px) {
    .nav-logo img,
    .logo-footer img {
        max-height: 50px;
    }
}

/* Ensure logos maintain aspect ratio */
.nav-logo img {
    height: auto;
    max-width: 200px;
}

.logo-footer img {
    height: auto;
    max-width: 150px;
}
"""
            
            # Remove old logo styles and add new ones
            if "Client Logo Styles" in content:
                # Remove old client logo styles
                content = content.replace("/* Client Logo Styles */", "/* Hard Feelings Tacos Logo Styles */")
                content = content.replace("Client Logo Styles", "Hard Feelings Tacos Logo Styles")
            else:
                # Add new logo styles
                content += logo_css
                
            with open(css_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print("✅ Updated CSS with Hard Feelings Tacos logo styles")
                
        except Exception as e:
            print(f"❌ Error updating CSS: {e}")
    
    def replace_all_logos(self):
        """Replace logos in all HTML files"""
        print("🔄 Starting Hard Feelings Tacos logo replacement...")
        
        # First, copy the logo files
        if not self.copy_logo_files():
            return False
        
        updated_files = 0
        
        # Replace logos in HTML files
        for html_file in self.html_files:
            if self.replace_logos_in_file(html_file):
                updated_files += 1
        
        # Update CSS
        self.update_css_styles()
        
        print(f"\n✅ Hard Feelings Tacos logo replacement complete!")
        print(f"📊 Updated {updated_files} HTML files")
        print(f"🎨 Updated CSS styles")
        print(f"📁 Logo files copied to images/ directory")
        
        return updated_files > 0

def main():
    replacer = HardFeelingsLogoReplacer()
    replacer.replace_all_logos()

if __name__ == "__main__":
    main()
