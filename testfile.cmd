"""
This script defines a function to find all prime numbers within a given range.
A prime number is a natural number greater than 1 that has no divisors other than 1 and itself.
The function takes two arguments representing the start and end of the range and returns a list of prime numbers within that range.
"""

def find_primes_in_range(start, end):
    """
    Finds all prime numbers within the given range [start, end].

    Args:
        start (int): The starting number of the range.
        end (int): The ending number of the range.

    Returns:
        list: A list of prime numbers within the range.
    """
    primes = []
    for num in range(start, end + 1):
        if num > 1:  # Prime numbers are greater than 1
            for i in range(2, int(num ** 0.5) + 1):
                if num % i == 0:
                    break
            else:
                primes.append(num)
    return primes

# Example usage
start_range = 10
end_range = 50
prime_numbers = find_primes_in_range(start_range, end_range)
print(f"Prime numbers between {start_range} and {end_range}: {prime_numbers}")