export const RadioPuzzle = {
  solutionFrequency: 97.0,
  tolerance: 0.2,
  isTuned(frequency) {
    return Math.abs(Number(frequency) - this.solutionFrequency) <= this.tolerance;
  }
};
