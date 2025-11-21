"""
collect.py

Usage:
  python collect.py --file samples/test_hotspots.py --lang python --out dataset.jsonl --sizes 100 400 1600 --repeats 3

What it does:
- Extracts static features using extract_features.py
- Runs the target program multiple times for each input size N
- Measures wall time, CPU time, peak RSS, (optionally) energy via pyRAPL if available
- Writes one JSON line per run to the output JSONL
"""
import argparse
import json
import os
import shlex
import subprocess
import sys
import time
import uuid
import math
from pathlib import Path
from datetime import datetime
import psutil
import platform
from extract_features import extract_features

# Optional pyRAPL for RAPL-based energy measurement (Linux)
try:
    import pyRAPL
    pyrapl_enabled = True
    pyRAPL.setup()
except Exception:
    pyrapl_enabled = False


def measure_process(cmd, timeout=None):
    """
    Run a process and measure wall time, cpu time, peak RSS, stdout/stderr.
    If pyrapl is available, measure energy_mJ.
    Returns dict with time_s, cpu_time_s, peak_mem_bytes, energy_mJ, stdout, stderr
    """
    start = time.perf_counter()
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=False)
    psproc = psutil.Process(proc.pid)
    peak_rss = 0
    cpu_time = 0.0
    energy_mJ = None

    try:
        if pyrapl_enabled:
            meter = pyRAPL.Measurement('cep-run')
            meter.begin()
        while proc.poll() is None:
            try:
                mem = psproc.memory_info().rss
                peak_rss = max(peak_rss, mem)
                cpu_time = psproc.cpu_times().user + psproc.cpu_times().system
            except psutil.NoSuchProcess:
                break
            time.sleep(0.005)
        stdout, stderr = proc.communicate(timeout=5)
        if pyrapl_enabled:
            meter.end()
            # pyRAPL returns microjoules in total_energy attribute depending on version
            energy_j = getattr(meter, "result", None)
            # handle different pyRAPL versions gracefully
            try:
                energy_j = meter.result.pkg if hasattr(meter.result, "pkg") else None
            except Exception:
                energy_j = None
            # fallback: meter.result.energy if present
            if energy_j is None and hasattr(meter, "result") and hasattr(meter.result, "energy"):
                energy_j = meter.result.energy
            if energy_j is not None:
                # convert J -> mJ
                energy_mJ = float(energy_j) * 1000.0
        end = time.perf_counter()
        return {
            "time_s": end - start,
            "cpu_time_s": cpu_time,
            "peak_mem_bytes": peak_rss,
            "energy_mJ": energy_mJ,
            "stdout": stdout.decode("utf-8", errors="ignore"),
            "stderr": stderr.decode("utf-8", errors="ignore"),
        }
    except Exception as e:
        try:
            proc.kill()
        except Exception:
            pass
        return {"time_s": None, "cpu_time_s": None, "peak_mem_bytes": None, "energy_mJ": None, "stdout": "", "stderr": str(e)}


def build_command(file: Path, language: str, input_size: int):
    """
    Builds a command list to run the target program.
    Assumes each program accepts an integer argument for input size when applicable.
    """
    if language == "python":
        return [sys.executable, str(file), str(input_size)]
    elif language == "javascript":
        return ["node", str(file), str(input_size)]
    elif language == "java":
        # compile if needed and run via java with classpath = file's parent
        # Expect the file contains a public class with same name as filename
        cls_name = file.stem
        # compile
        compile_cmd = ["javac", str(file)]
        subprocess.run(compile_cmd, check=True)
        # run - set working dir to file.parent
        return ["java", "-cp", str(file.parent), cls_name, str(input_size)]
    else:
        raise ValueError("Unsupported language: " + language)


def system_metadata():
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "hostname": platform.node(),
        "os": platform.platform(),
        "cpu": platform.processor(),
        "python_version": platform.python_version(),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path to source code file")
    parser.add_argument("--lang", required=True, choices=["python", "javascript", "java"])
    parser.add_argument("--out", required=True, help="Output JSONL path")
    parser.add_argument("--sizes", nargs="+", type=int, default=[100, 400, 1600])
    parser.add_argument("--repeats", type=int, default=3, help="Repeat each run to reduce noise (median will be used)")
    parser.add_argument("--id", required=False, help="Optional sample id")
    args = parser.parse_args()

    src_path = Path(args.file)
    if not src_path.exists():
        print("File not found:", src_path)
        return

    source = src_path.read_text()
    sample_id = args.id or src_path.stem
    static_features = extract_features(source, args.lang)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    for N in args.sizes:
        run_results = []
        for r in range(args.repeats):
            cmd = build_command(src_path, args.lang, N)
            print("Running:", cmd)
            # measure
            res = measure_process(cmd)
            res["run_index"] = r
            run_results.append(res)

        # choose median/robust aggregate for time/cpu/peak_mem/energy
        times = sorted([rr["time_s"] or float("inf") for rr in run_results])
        mems = sorted([rr["peak_mem_bytes"] or 0 for rr in run_results])
        cpus = sorted([rr["cpu_time_s"] or 0 for rr in run_results])
        energies = sorted([rr["energy_mJ"] or float("nan") for rr in run_results])

        # median selection
        median_idx = len(times) // 2
        aggregated = {
            "time_s": None if math.isinf(times[median_idx]) else times[median_idx],
            "cpu_time_s": None if math.isinf(cpus[median_idx]) else cpus[median_idx],
            "peak_mem_bytes": mems[median_idx],
            "energy_mJ": (energies[median_idx] if not math.isnan(energies[median_idx]) else None),
        }

        entry = {
            "sample_id": sample_id,
            "language": args.lang,
            "source_path": str(src_path),
            "source": source,
            "run_id": f"{sample_id}::N={N}",
            "input_size": N,
            "static_features": static_features,
            "dynamic": {
                "time_s": aggregated["time_s"],
                "cpu_time_s": aggregated["cpu_time_s"],
                "peak_mem_bytes": aggregated["peak_mem_bytes"],
                "energy_mJ": aggregated["energy_mJ"],
                "stdout": run_results[median_idx].get("stdout", ""),
                "stderr": run_results[median_idx].get("stderr", ""),
            },
            "metadata": system_metadata(),
            "labels": {}
        }
        with open(out_path, "a") as f:
            f.write(json.dumps(entry) + "\n")
        print("Wrote run:", entry["run_id"])


if __name__ == "__main__":
    main()