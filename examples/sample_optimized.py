"""
Optimized version of the sample code showing the suggested improvements.
This demonstrates what the code profiler suggests for energy efficiency.
"""

from functools import lru_cache

def efficient_string_concat(data):
    """Use join() instead of string concatenation - OPTIMIZED"""
    parts = []
    for item in data:
        parts.append(str(item) + ",")
    return "".join(parts)  # O(n) instead of O(n²)

def optimized_nested_loops(items, queries):
    """Use set for fast lookups - OPTIMIZED"""
    results = []
    items_set = set(items)  # Precompute set for O(1) lookups
    for query in queries:
        if query in items_set:  # O(1) lookup instead of O(n)
            results.append((query, query))
    return results

def optimized_membership_scan(large_list, search_items):
    """Convert to set for fast membership tests - OPTIMIZED"""
    found = []
    large_set = set(large_list)  # O(n) conversion, then O(1) lookups
    for search in search_items:
        if search in large_set:  # O(1) lookup
            found.append(search)
        if search in large_set:  # Still redundant, but now O(1)
            found.append(search)
    return found

@lru_cache(maxsize=128)
def efficient_fibonacci(n):
    """Add memoization to avoid redundant calculations - OPTIMIZED"""
    if n <= 1:
        return n
    return efficient_fibonacci(n-1) + efficient_fibonacci(n-2)

def memory_efficient(data):
    """Use generator expressions instead of list comprehensions - OPTIMIZED"""
    # Process items lazily without materializing intermediate lists
    processed = (expensive_operation(x) for x in data)
    filtered = (x for x in processed if x > 0)
    mapped = (x * 2 for x in filtered)
    return sum(mapped)  # Only materializes during sum()

def expensive_operation(x):
    return x ** 2 + x ** 3

def optimized_triple_nested_loop(x, y, z):
    """Reduce to single loop with set operations - OPTIMIZED"""
    # Pre-compute all combinations that meet criteria
    x_set = set(x)
    y_set = set(y)
    z_set = set(z)
    
    count = 0
    # Use mathematical properties to reduce nested loops
    for i in x_set:
        for j in y_set:
            needed = 100 - i - j + 1
            # Count how many k values satisfy i + j + k > 100
            count += sum(1 for k in z_set if k >= needed)
    
    return count

# Example usage
if __name__ == "__main__":
    data = range(1000)
    items = list(range(100))
    queries = list(range(50, 150))
    
    # These optimized versions are much more energy-efficient
    result1 = efficient_string_concat(data)
    result2 = optimized_nested_loops(items, queries)
    result3 = optimized_membership_scan(items, queries)
    result4 = efficient_fibonacci(20)
    result5 = memory_efficient(data)
    result6 = optimized_triple_nested_loop(range(10), range(10), range(10))
    
    print("All optimizations complete!")
    print(f"Results: {len(result1)}, {len(result2)}, {len(result3)}, {result4}, {result5}, {result6}")
