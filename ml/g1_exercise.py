grades = [10, 15, 5, 20, 0]

count = len(grades)
mean_val = sum(grades) / count
min_val = min(grades)
max_val = max(grades)

print(f"Count: {count}")
print(f"Mean: {mean_val}")
print(f"Min: {min_val}")
print(f"Max: {max_val}")

assert count == 5, "Error: count should be 5"
assert mean_val == 10.0, "Error: mean should be 10"
assert min_val == 0, "Error: min should be 0"
assert max_val == 20, "Error: max should be 20"

print("G1 synthetic test passed successfully!")