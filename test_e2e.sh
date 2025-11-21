#!/bin/bash
# End-to-end test script for Code Energy Profiler

set -e  # Exit on error

echo "=========================================="
echo "Code Energy Profiler - E2E Test"
echo "=========================================="

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

test_step() {
    echo -e "\n${YELLOW}Testing: $1${NC}"
}

test_pass() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    ((FAILED++))
}

# 1. Test Node.js dependencies
test_step "Node.js dependencies"
if npm list > /dev/null 2>&1; then
    test_pass "All npm packages installed"
else
    test_fail "Missing npm packages"
fi

# 2. Test TypeScript build
test_step "TypeScript compilation"
if npm run build > /dev/null 2>&1; then
    test_pass "TypeScript build successful"
else
    test_fail "TypeScript build failed"
fi

# 3. Test unit tests
test_step "Unit tests"
if npm test > /dev/null 2>&1; then
    test_pass "All unit tests passed"
else
    test_fail "Unit tests failed"
fi

# 4. Test ML dataset
test_step "ML dataset generation"
cd ml
if [ -f "sample_dataset.csv" ]; then
    ROWS=$(wc -l < sample_dataset.csv)
    if [ $ROWS -gt 100 ]; then
        test_pass "Dataset exists with $ROWS rows"
    else
        test_fail "Dataset too small"
    fi
else
    test_fail "Dataset not found"
fi

# 5. Test trained model
test_step "Trained ML model"
if [ -f "energy_model.pkl" ]; then
    SIZE=$(stat -f%z "energy_model.pkl" 2>/dev/null || stat -c%s "energy_model.pkl" 2>/dev/null)
    if [ $SIZE -gt 1000 ]; then
        test_pass "Model file exists (${SIZE} bytes)"
    else
        test_fail "Model file too small"
    fi
else
    test_fail "Model file not found"
fi

# 6. Test ONNX export
test_step "ONNX model export"
cd ..
if [ -f "model_artifacts/energy_model.onnx" ]; then
    SIZE=$(stat -f%z "model_artifacts/energy_model.onnx" 2>/dev/null || stat -c%s "model_artifacts/energy_model.onnx" 2>/dev/null)
    if [ $SIZE -gt 10000 ]; then
        test_pass "ONNX model exists (${SIZE} bytes)"
    else
        test_fail "ONNX model too small"
    fi
else
    test_fail "ONNX model not found"
fi

# 7. Test ML pipeline
test_step "ML pipeline validation"
cd ml
if python test_pipeline.py > /dev/null 2>&1; then
    test_pass "ML pipeline validation passed"
else
    test_fail "ML pipeline validation failed"
fi
cd ..

# 8. Test API server availability
test_step "API server imports"
if python -c "from api.server import app; from api.schemas import PredictionRequest" 2>/dev/null; then
    test_pass "API server modules load correctly"
else
    test_fail "API server import failed"
fi

# 9. Test example files
test_step "Example files"
if [ -f "examples/sample_inefficient.py" ] && [ -f "examples/sample_optimized.py" ]; then
    test_pass "Example files exist"
else
    test_fail "Example files missing"
fi

# 10. Test documentation
test_step "Documentation"
DOC_COUNT=0
[ -f "ARCHITECTURE_IMPLEMENTATION.md" ] && ((DOC_COUNT++))
[ -f "QUICKSTART.md" ] && ((DOC_COUNT++))
[ -f "docs/README.md" ] && ((DOC_COUNT++))

if [ $DOC_COUNT -ge 2 ]; then
    test_pass "Documentation files present ($DOC_COUNT files)"
else
    test_fail "Insufficient documentation"
fi

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! System is ready.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review.${NC}"
    exit 1
fi
