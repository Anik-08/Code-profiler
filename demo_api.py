#!/usr/bin/env python3
"""
Demo script showing the API in action with different code examples
"""
import requests
import json

API_URL = "http://localhost:8080"

def test_api():
    """Test the API with various code patterns"""
    
    print("=" * 70)
    print("Code Energy Profiler - API Demo")
    print("=" * 70)
    
    # Check health
    print("\n1. Health Check:")
    response = requests.get(f"{API_URL}/health")
    health = response.json()
    print(f"   Status: {health['status']}")
    print(f"   Model Loaded: {health['model_loaded']}")
    print(f"   Model Version: {health['model_version']}")
    
    # Test cases with different patterns
    test_cases = [
        {
            "name": "Simple Code (Low Energy)",
            "features": {
                "languageId": "python",
                "tokenCount": 100,
                "loopCount": 1,
                "nestedLoopDepth": 1,
                "stringConcatOps": 0,
                "listScanOps": 2,
                "functionCount": 1,
                "avgFunctionLength": 50,
                "hotspotsSeeds": [
                    {"start_line": 5, "start_char": 0, "end_line": 10, "end_char": 20}
                ],
                "version": "0.1.0"
            }
        },
        {
            "name": "Nested Loops (High Energy)",
            "features": {
                "languageId": "python",
                "tokenCount": 500,
                "loopCount": 5,
                "nestedLoopDepth": 3,
                "stringConcatOps": 2,
                "listScanOps": 10,
                "functionCount": 2,
                "avgFunctionLength": 120,
                "hotspotsSeeds": [
                    {"start_line": 10, "start_char": 0, "end_line": 20, "end_char": 50},
                    {"start_line": 25, "start_char": 0, "end_line": 35, "end_char": 50}
                ],
                "version": "0.1.0"
            }
        },
        {
            "name": "String Concatenation (Medium Energy)",
            "features": {
                "languageId": "python",
                "tokenCount": 300,
                "loopCount": 2,
                "nestedLoopDepth": 1,
                "stringConcatOps": 8,
                "listScanOps": 3,
                "functionCount": 2,
                "avgFunctionLength": 80,
                "hotspotsSeeds": [
                    {"start_line": 15, "start_char": 0, "end_line": 22, "end_char": 40}
                ],
                "version": "0.1.0"
            }
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i+1}. Testing: {test_case['name']}")
        print("-" * 70)
        
        response = requests.post(
            f"{API_URL}/v1/predict",
            json={"features": test_case["features"]}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"   File Energy Score: {result['fileScore']:.3f}")
            print(f"   Model Version: {result['modelVersion']}")
            print(f"   Hotspots Detected: {len(result['hotspots'])}")
            
            for j, hotspot in enumerate(result['hotspots'], 1):
                print(f"\n   Hotspot {j}:")
                print(f"      Lines: {hotspot['start_line']}-{hotspot['end_line']}")
                print(f"      Score: {hotspot['score']:.3f}")
                print(f"      Confidence: {hotspot['confidence']:.2f}")
                print(f"      Estimated Energy: {hotspot['estimate_mJ']} mJ")
                if hotspot['suggestion']:
                    print(f"      Suggestion: {hotspot['suggestion']}")
        else:
            print(f"   ERROR: {response.status_code}")
            print(f"   {response.text}")
    
    print("\n" + "=" * 70)
    print("Demo completed successfully!")
    print("=" * 70)

if __name__ == "__main__":
    try:
        test_api()
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to API server")
        print("Please start the server first:")
        print("  cd api && uvicorn server:app --port 8080")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
