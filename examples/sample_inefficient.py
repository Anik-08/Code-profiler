"""
Sample inefficient Python code for testing the energy profiler.
This file demonstrates various energy hotspots that should be detected.
"""

def inefficient_string_concat(data):
    """String concatenation in loop - HOTSPOT"""
    result = ""
    for item in data:
        result += str(item) + ","  # Energy hotspot: O(n²) string concatenation
    return result

def nested_loops_example(items, queries):
    """Nested loops with repeated membership tests - HOTSPOT"""
    results = []
    for query in queries:
        for item in items:  # Nested loop
            if query == item:
                results.append((query, item))
    return results

def list_membership_scan(large_list, search_items):
    """Repeated membership tests in list - HOTSPOT"""
    found = []
    for search in search_items:
        if search in large_list:  # O(n) scan repeated
            found.append(search)
        if search in large_list:  # Redundant scan
            found.append(search)
    return found

def recursive_fibonacci(n):
    """Inefficient recursion without memoization - HOTSPOT"""
    if n <= 1:
        return n
    return recursive_fibonacci(n-1) + recursive_fibonacci(n-2)

def memory_intensive(data):
    """Memory-intensive list comprehension - HOTSPOT"""
    # Creates entire list in memory instead of using generator
    processed = [expensive_operation(x) for x in data]
    filtered = [x for x in processed if x > 0]
    mapped = [x * 2 for x in filtered]
    return sum(mapped)

def expensive_operation(x):
    return x ** 2 + x ** 3

def triple_nested_loop(x, y, z):
    """Triple nested loop - MAJOR HOTSPOT"""
    result = 0
    for i in x:
        for j in y:
            for k in z:  # Triple nesting!
                if i + j + k > 100:
                    result += 1
    return result

# Example usage
if __name__ == "__main__":
    data = range(1000)
    items = list(range(100))
    queries = list(range(50, 150))
    
    # These calls will trigger hotspot detection
    result1 = inefficient_string_concat(data)
    result2 = nested_loops_example(items, queries)
    result3 = list_membership_scan(items, queries)
    result4 = recursive_fibonacci(20)
    result5 = memory_intensive(data)
    result6 = triple_nested_loop(range(10), range(10), range(10))
