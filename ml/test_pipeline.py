#!/usr/bin/env python3
"""Test script to verify the entire ML pipeline"""
import os
import sys
import pandas as pd
import numpy as np
import joblib

def test_dataset():
    """Test dataset generation"""
    print("1. Testing dataset generation...")
    if not os.path.exists("sample_dataset.csv"):
        print("   ❌ Dataset not found")
        return False
    
    df = pd.read_csv("sample_dataset.csv")
    print(f"   ✓ Dataset loaded: {len(df)} rows")
    
    required_cols = ["loopCount", "nestedLoopDepth", "stringConcatOps", 
                     "listScanOps", "functionCount", "avgFunctionLength", "energyLabel"]
    
    for col in required_cols:
        if col not in df.columns:
            print(f"   ❌ Missing column: {col}")
            return False
    
    print(f"   ✓ All required columns present")
    return True

def test_model():
    """Test model training"""
    print("\n2. Testing model...")
    if not os.path.exists("energy_model.pkl"):
        print("   ❌ Model not found")
        return False
    
    model = joblib.load("energy_model.pkl")
    print(f"   ✓ Model loaded successfully")
    
    # Test prediction
    test_features = np.array([[5, 2, 3, 10, 5, 100]])
    prediction = model.predict(test_features)
    print(f"   ✓ Test prediction: {prediction[0]:.2f}")
    
    return True

def test_onnx():
    """Test ONNX export"""
    print("\n3. Testing ONNX model...")
    onnx_path = "../model_artifacts/energy_model.onnx"
    
    if not os.path.exists(onnx_path):
        print(f"   ❌ ONNX model not found at {onnx_path}")
        return False
    
    file_size = os.path.getsize(onnx_path)
    print(f"   ✓ ONNX model exists ({file_size} bytes)")
    
    # Try to load with onnxruntime
    try:
        import onnxruntime as rt
        sess = rt.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
        print(f"   ✓ ONNX model is valid")
        
        # Test inference
        test_input = np.array([[5, 2, 3, 10, 5, 100]], dtype=np.float32)
        input_name = sess.get_inputs()[0].name
        output = sess.run(None, {input_name: test_input})
        print(f"   ✓ ONNX inference test: {output[0][0]:.2f}")
        
    except ImportError:
        print("   ⚠ onnxruntime not installed, skipping validation")
    except Exception as e:
        print(f"   ❌ ONNX validation error: {e}")
        return False
    
    return True

def main():
    print("=" * 60)
    print("Code Energy Profiler - ML Pipeline Test")
    print("=" * 60)
    
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    results = [
        test_dataset(),
        test_model(),
        test_onnx()
    ]
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ All tests passed!")
        print("=" * 60)
        return 0
    else:
        print("❌ Some tests failed")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
