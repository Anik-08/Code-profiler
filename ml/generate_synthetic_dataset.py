import pandas as pd
import numpy as np

def synthetic_row():
    loop = np.random.randint(0, 15)
    depth = np.random.randint(0, 5)
    concat = np.random.randint(0, 10)
    scan = np.random.randint(0, 20)
    fn_count = np.random.randint(1, 12)
    avg_len = np.random.randint(5, 250)
    # Synthetic "energy" label
    energy = (0.5*depth + 0.3*loop + 0.2*concat + 0.15*scan + 0.1*(avg_len/50))
    energy += np.random.normal(0, 0.5)
    return loop, depth, concat, scan, fn_count, avg_len, max(0, energy)

rows = [synthetic_row() for _ in range(2000)]
df = pd.DataFrame(rows, columns=[
  "loopCount", "nestedLoopDepth", "stringConcatOps", "listScanOps",
  "functionCount", "avgFunctionLength", "energyLabel"
])
df.to_csv("sample_dataset.csv", index=False)
print("Generated sample_dataset.csv")