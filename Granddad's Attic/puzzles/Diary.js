export const DiaryPuzzle = {
  cipherText: "KRQRU",
  solution: "HONOR",
  check(value) {
    return String(value).trim().toUpperCase() === this.solution;
  }
};
