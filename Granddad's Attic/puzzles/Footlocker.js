export const FootlockerPuzzle = {
  solution: [6, 14, 46],
  check(values) {
    return values.every((value, index) => Number(value) === this.solution[index]);
  }
};
