export const TitleScreen = {
  mount(root, { hasSave = false, onBegin, onResume, onStartOver }) {
    root.innerHTML = "";

    const screen = document.createElement("section");
    screen.className = "title-screen with-vignette";
    screen.innerHTML = `<img class="title-bg" src="assets/scenes/center.webp" alt="" aria-hidden="true">`;

    const content = document.createElement("div");
    content.className = "title-copy";

    const title = document.createElement("h1");
    title.textContent = "Granddad's Attic";

    const tagline = document.createElement("p");
    tagline.textContent = "Some secrets wait sixty years to be told.";

    const actions = document.createElement("div");
    actions.className = "title-actions";

    const begin = document.createElement("button");
    begin.className = "primary-button";
    begin.type = "button";
    begin.textContent = hasSave ? "New Game" : "Begin";
    bindAction(begin, onBegin);
    actions.append(begin);

    if (hasSave) {
      const resume = document.createElement("button");
      resume.className = "primary-button";
      resume.type = "button";
      resume.textContent = "Resume";
      bindAction(resume, onResume);
      actions.prepend(resume);

      const startOver = document.createElement("button");
      startOver.className = "secondary-button";
      startOver.type = "button";
      startOver.textContent = "Start Over";
      bindAction(startOver, onStartOver);
      actions.append(startOver);
    }

    content.append(title, tagline, actions);
    screen.append(content);
    root.append(screen);
  }
};

function bindAction(button, action) {
  let handledPointer = false;
  const run = (event) => {
    event.preventDefault();
    action?.();
  };

  button.addEventListener("pointerup", (event) => {
    handledPointer = true;
    run(event);
  });
  button.addEventListener("click", (event) => {
    if (handledPointer) {
      handledPointer = false;
      return;
    }
    run(event);
  });
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      run(event);
    }
  });
}
