export const SafePuzzle = {
  solution: "HONOR",
  check(value) {
    return String(value).trim().toUpperCase() === this.solution;
  }
};
