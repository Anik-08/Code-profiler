import time
import subprocess
import statistics

# Simplified timing harness; real energy would integrate RAPL or external sensor
def run_snippet(path: str, runs=5):
    durations = []
    for _ in range(runs):
        start = time.perf_counter()
        subprocess.run(["python", path], check=True)
        durations.append(time.perf_counter() - start)
    return statistics.mean(durations), statistics.pstdev(durations)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python measure_energy.py script.py")
        sys.exit(1)
    mean, std = run_snippet(sys.argv[1])
    print(f"Average runtime: {mean:.4f}s ± {std:.4f}s (proxy for energy)")