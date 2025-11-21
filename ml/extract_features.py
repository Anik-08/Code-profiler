"""
extract_features.py

Language-aware static feature extractor for Code Energy Profiler ML pipeline.
This mirrors and extends the TypeScript heuristics to provide more fields for ML.
"""
import re
from typing import Dict, Any, Tuple, List


def strip_comments(code: str, language: str) -> str:
    if language == "python":
        # Remove # comments (simple), preserve strings untouched (naive)
        return re.sub(r"#.*", "", code)
    else:
        # Remove /* ... */ and //...
        code = re.sub(r"/\*[\s\S]*?\*/", "", code)
        code = re.sub(r"//.*", "", code)
        return code


def compute_brace_nesting(lines: List[str]) -> Tuple[int, List[int]]:
    """
    For brace-based languages compute max nesting and per-line depth.
    Returns (max_depth, depths_list)
    """
    depth = 0
    max_depth = 0
    depths = []
    for line in lines:
        # reduce for leading closings
        leading_closings = len(re.findall(r"^\s*}", line))
        if leading_closings:
            depth = max(0, depth - leading_closings)
        # count loop keywords at current depth
        depths.append(depth)
        openings = len(re.findall(r"{", line))
        closings = len(re.findall(r"}", line))
        depth = max(0, depth + openings - closings)
        max_depth = max(max_depth, depth)
    return max_depth, depths


def compute_python_indent_nesting(lines: List[str]) -> int:
    depth = 0
    max_depth = 0
    for line in lines:
        if re.search(r"^\s*(for|while)\b", line):
            depth += 1
            max_depth = max(max_depth, depth)
        elif line.strip() == "":
            depth = max(0, depth - 1)
    return max_depth


def detect_recursion(code: str, language: str) -> bool:
    # Very naive: if a function name appears inside its own body.
    # Works best for small examples; AST-based approach is better long term.
    fn_defs = []
    if language == "python":
        for m in re.finditer(r"^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", code, re.MULTILINE):
            fn_defs.append(m.group(1))
    elif language in ("javascript", "typescript"):
        for m in re.finditer(r"function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", code):
            fn_defs.append(m.group(1))
        for m in re.finditer(r"([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(", code):
            fn_defs.append(m.group(1))
    elif language == "java":
        for m in re.finditer(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*\(", code):
            # not perfect, but capture candidate names
            fn_defs.append(m.group(1))
    for name in fn_defs:
        # naive check if name used inside code body more than its def
        occurrences = len(re.findall(r"\b" + re.escape(name) + r"\b", code))
        if occurrences > 1:
            return True
    return False


def count_api_calls(code: str, patterns: Dict[str, str]) -> Dict[str, int]:
    res = {}
    for k, p in patterns.items():
        res[k] = len(re.findall(p, code))
    return res


def extract_features(code: str, language: str) -> Dict[str, Any]:
    """
    Returns a rich dict of static features extracted from code.
    """
    raw_lines = code.splitlines()
    code_no_comments = strip_comments(code, language)
    lines = [l for l in code_no_comments.splitlines()]

    # Basic counts
    token_count = len(code_no_comments)
    line_count = sum(1 for l in lines if l.strip())

    # Loop detection
    loop_regex = re.compile(r"\b(for|while)\b")
    loop_count = sum(1 for l in lines if loop_regex.search(l))

    # Nested depth
    if language in ("javascript", "typescript", "java"):
        nested_depth, _depths = compute_brace_nesting(lines)
    else:
        nested_depth = compute_python_indent_nesting(lines)

    # String concatenation ops
    string_concat_ops = len(re.findall(r"\+=\s*['\"`]", code_no_comments))

    # Membership / contains scans
    python_in_ops = len(re.findall(r"\b(in)\s+[A-Za-z_][A-Za-z0-9_]*\b", code_no_comments))
    js_includes_ops = len(re.findall(r"\.includes\s*\(", code_no_comments))
    java_contains_ops = len(re.findall(r"\.contains\s*\(", code_no_comments))
    list_scan_ops = python_in_ops + js_includes_ops + java_contains_ops

    # Sort / expensive ops
    sort_ops = len(re.findall(r"\b(sort|Collections\.sort|\.sort\()", code_no_comments))

    # Allocations and container mentions
    new_ops = len(re.findall(r"\bnew\s+[A-Za-z0-9_\.]+\b", code_no_comments))
    array_literals = len(re.findall(r"\[[^\]]+\]", code_no_comments))
    map_like = len(re.findall(r"\b(Map|HashMap|dict|set|Set|ArrayList|List)\b", code_no_comments, re.IGNORECASE))

    # cyclomatic tokens
    cyclomatic_tokens = len(re.findall(r"\b(if|elif|else if|switch|case|default|catch|for|while)\b|&&|\|\|", code_no_comments))

    # function definitions and lengths (naive)
    fn_patterns = {
        "python": r"^\s*def\s+[A-Za-z_][A-Za-z0-9_]*\s*\(",
        "js": r"^\s*(function\b|const\s+[A-Za-z_][A-Za-z0-9_]*\s*=|\b[A-Za-z_][A-Za-z0-9_]*\s*=\s*\()",
        "java": r"^\s*(public|private|protected|\s)*\s*[A-Za-z0-9_<>\[\]]+\s+[A-Za-z_][A-Za-z0-9_]*\s*\("
    }
    fn_re = re.compile(fn_patterns["python"], re.MULTILINE) if language == "python" else re.compile(fn_patterns["js"], re.MULTILINE) if language in ("javascript", "typescript") else re.compile(fn_patterns["java"], re.MULTILINE)
    function_count = len(re.findall(fn_re, code_no_comments))

    avg_function_length = 0
    if function_count > 0:
        # naive: approximate function length as lines / function_count
        avg_function_length = line_count / function_count

    recursion_detected = detect_recursion(code_no_comments, language)

    # heuristic: repeated rebuilds inside loops
    has_repeated_builds_in_loop = False
    # detect patterns like "for ...: <something creation>" or "for (...) { new ... }"
    for l in lines:
        if loop_regex.search(l):
            # look at following few lines for allocations
            idx = lines.index(l)
            window = lines[idx: min(idx + 8, len(lines))]
            window_text = "\n".join(window)
            if re.search(r"\bnew\s+|=\s*\[\]|\.add\(|list\(|dict\(|ArrayList<", window_text):
                has_repeated_builds_in_loop = True
                break

    # API call counts (examples)
    api_patterns = {
        "regex": r"\bre\.search\(|\.match\(|re\.compile\(",
        "io": r"\b(open\(|fs\.readFileSync\b|\bFileReader\b)",
        "sort": r"\b(sort|Collections\.sort|\.sort\()"
    }
    api_call_counts = count_api_calls(code_no_comments, api_patterns)

    comment_lines = sum(1 for l in raw_lines if re.match(r"^\s*(#|//|/\*)", l))
    comment_ratio = comment_lines / max(1, len(raw_lines))

    features = {
        "languageId": language,
        "tokenCount": token_count,
        "lineCount": line_count,
        "loopCount": loop_count,
        "nestedLoopDepth": nested_depth,
        "stringConcatOps": string_concat_ops,
        "listScanOps": list_scan_ops,
        "sortOps": sort_ops,
        "newOps": new_ops,
        "arrayLiterals": array_literals,
        "mapLike": map_like,
        "recursionDetected": recursion_detected,
        "cyclomaticTokens": cyclomatic_tokens,
        "functionCount": function_count,
        "avgFunctionLength": avg_function_length,
        "hasRepeatedBuildsInLoop": has_repeated_builds_in_loop,
        "apiCallCounts": api_call_counts,
        "commentRatio": comment_ratio,
        "containsOpsJava": java_contains_ops,
    }
    return features


if __name__ == "__main__":
    # simple CLI demo
    import argparse, json
    p = argparse.ArgumentParser()
    p.add_argument("file")
    p.add_argument("--lang", required=False, default="python")
    args = p.parse_args()
    with open(args.file) as f:
        code = f.read()
    print(json.dumps(extract_features(code, args.lang), indent=2))