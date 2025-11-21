#!/bin/bash

set -e  # Stop on error

echo "Starting dataset collection..."

# Python examples
echo "Processing Python samples..."
for f in samples/python/*.py; do
  echo "Processing $f"
  python ml/collect.py --file "$f" --lang python --out dataset.jsonl --sizes 100 400 1600 --repeats 3
done

# Javascript examples
echo "Processing JavaScript samples..."
for f in samples/javascript/*.js; do
  echo "Processing $f"
  python ml/collect.py --file "$f" --lang javascript --out dataset.jsonl --sizes 500 2000 8000 --repeats 3
done

# Java examples
echo "Processing Java samples..."
for f in samples/java/*.java; do
  echo "Processing $f"
  python ml/collect.py --file "$f" --lang java --out dataset.jsonl --sizes 50 100 200 --repeats 3
done

echo "Dataset collection completed!"
