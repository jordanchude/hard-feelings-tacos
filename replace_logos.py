#!/usr/bin/env python3
"""
Automated Logo Replacement Script
Replaces existing logos in HTML files with new client logos
"""

import os
import re
from pathlib import Path

class LogoReplacer:
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
        
        # Logo replacement mappings
        self.logo_replacements = {
            "thali-logo.svg": "client-logo.png",
            "thali-logo-white.svg": "client-logo-white.png"
        }
    
    def replace_logos_in_file(self, file_path):
        """Replace logo references in a single HTML file"""
        if not os.path.exists(file_path):
            print(f"⚠️  File not found: {file_path}")
            return False
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Replace logo references
            for old_logo, new_logo in self.logo_replacements.items():
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
        """Update CSS to ensure proper logo sizing"""
        css_file = "css/hard-feelings-tacos.webflow.css"
        
        if not os.path.exists(css_file):
            print(f"⚠️  CSS file not found: {css_file}")
            return
        
        try:
            with open(css_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add CSS rules for client logos
            logo_css = """
/* Client Logo Styles */
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
"""
            
            # Append logo styles if not already present
            if "Client Logo Styles" not in content:
                content += logo_css
                
                with open(css_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                print("✅ Updated CSS with logo styles")
            else:
                print("ℹ️  Logo styles already present in CSS")
                
        except Exception as e:
            print(f"❌ Error updating CSS: {e}")
    
    def replace_all_logos(self):
        """Replace logos in all HTML files"""
        print("🔄 Starting logo replacement process...")
        
        updated_files = 0
        
        for html_file in self.html_files:
            if self.replace_logos_in_file(html_file):
                updated_files += 1
        
        # Update CSS
        self.update_css_styles()
        
        print(f"\n✅ Logo replacement complete!")
        print(f"📊 Updated {updated_files} HTML files")
        print(f"🎨 Updated CSS styles")
        
        return updated_files > 0

def main():
    replacer = LogoReplacer()
    replacer.replace_all_logos()

if __name__ == "__main__":
    main()
