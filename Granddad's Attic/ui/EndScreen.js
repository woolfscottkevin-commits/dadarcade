export const EndScreen = {
  mount(root, { solveTime, onPlayAgain }) {
    root.innerHTML = `
      <section class="title-screen end-screen">
        <img class="end-image" src="assets/scenes/end.webp" alt="">
        <div class="end-copy">
          <p class="ending-kicker">The attic is quiet again.</p>
          <h1>Granddad's Attic</h1>
          <p>You found what he left behind, and the room finally let go of its secret.</p>
          <p class="solve-time">Solved in ${solveTime}</p>
          <button class="primary-button" type="button">Play Again</button>
        </div>
      </section>
    `;
    root.querySelector("button").addEventListener("click", onPlayAgain);
  }
};
