#!/bin/bash
# Setup script for Code Energy Profiler Extension

set -e  # Exit on error

echo "=========================================="
echo "Code Energy Profiler - Setup Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Install Node.js dependencies
echo -e "${YELLOW}[1/4] Installing Node.js dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

echo ""

# Step 2: Build TypeScript
echo -e "${YELLOW}[2/4] Building TypeScript extension...${NC}"
if npm run build; then
    echo -e "${GREEN}✓ Extension built successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo ""

# Step 3: Check if Python is available for ML model
echo -e "${YELLOW}[3/4] Checking Python environment...${NC}"
if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✓ Python3 found${NC}"
    
    # Optional: Train ML model
    read -p "Do you want to train the ML model now? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}   Training ML model (this may take a minute)...${NC}"
        cd ml
        if pip install -q -r ../api/requirements.txt; then
            python generate_synthetic_dataset.py
            python train_model.py
            python export_onnx.py
            cd ..
            echo -e "${GREEN}✓ ML model trained and exported${NC}"
        else
            echo -e "${RED}✗ Failed to train model${NC}"
            cd ..
        fi
    else
        echo "   Skipping ML model training (you can run it later with: cd ml && ./train.sh)"
    fi
else
    echo -e "${YELLOW}⚠ Python3 not found - skipping ML model setup${NC}"
    echo "   You can train the model later by running: cd ml && python3 train_model.py"
fi

echo ""

# Step 4: Verify setup
echo -e "${YELLOW}[4/4] Verifying setup...${NC}"

ISSUES=0

if [ ! -d "out" ]; then
    echo -e "${RED}✗ out/ directory not found${NC}"
    ((ISSUES++))
else
    echo -e "${GREEN}✓ out/ directory exists${NC}"
fi

if [ ! -f "out/extension.js" ]; then
    echo -e "${RED}✗ out/extension.js not found${NC}"
    ((ISSUES++))
else
    echo -e "${GREEN}✓ Extension compiled${NC}"
fi

if [ ! -d "node_modules" ]; then
    echo -e "${RED}✗ node_modules not found${NC}"
    ((ISSUES++))
else
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

echo ""
echo "=========================================="

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ Setup completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Press F5 in VS Code to launch Extension Development Host"
    echo "  2. Open a Python/JavaScript file in the new window"
    echo "  3. Try: Cmd/Ctrl+Shift+P → 'Code Energy Profiler: Analyze Current File'"
    echo ""
    echo "See SETUP.md for detailed instructions."
else
    echo -e "${RED}✗ Setup completed with $ISSUES issue(s)${NC}"
    echo "Please check the errors above and try again."
    exit 1
fi
