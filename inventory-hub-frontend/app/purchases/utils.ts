export function calculateJPY(cnyAmount: number, cnyToJpyRate: number) {
  return (cnyAmount * cnyToJpyRate).toFixed(2);
}
