/**
 * Return positive modulo n % m
 * @param {number} n
 * @param {number} m
 */
export function mod(n, m) {
  return ((n % m) + m) % m;
}
