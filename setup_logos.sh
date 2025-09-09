
#!/bin/bash

# Create organized directory structure for logos
mkdir -p assets/logos/{main,white,icons,raw}

echo "Created logo directory structure:"
echo "  assets/logos/main/     - Main logo files"
echo "  assets/logos/white/    - White/inverted versions"
echo "  assets/logos/icons/    - Icon-only versions"
echo "  assets/logos/raw/      - Raw extracted files"
echo ""
echo "Next steps:"
echo "1. Extract logos from PDF pages using Preview or online tools"
echo "2. Save main logo as: assets/logos/main/logo.png"
echo "3. Save white version as: assets/logos/white/logo-white.png"
echo "4. Save icon as: assets/logos/icons/logo-icon.png"
echo ""
echo "Recommended file formats:"
echo "  - PNG for logos with transparencyos 
echo "  - SVG for scalable vector logos (best quality)"
echo "  - Minimum 1000px width for web use"
