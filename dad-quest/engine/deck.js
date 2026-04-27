// Pure deck/hand/discard/exhaust functions for Dad Quest combat.
// Card instances are { uuid, cardId } — never mutate shared definitions.

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createCombatDeck(runDeck) {
  const drawPile = runDeck.slice();
  shuffle(drawPile);
  return {
    drawPile,
    hand: [],
    discardPile: [],
    exhaustPile: [],
  };
}

// Move up to n cards from drawPile to hand.
// If drawPile empties mid-draw, reshuffle discardPile back into drawPile.
export function drawCards(combatState, n) {
  for (let i = 0; i < n; i++) {
    if (combatState.drawPile.length === 0) {
      if (combatState.discardPile.length === 0) return;
      combatState.drawPile = combatState.discardPile;
      combatState.discardPile = [];
      shuffle(combatState.drawPile);
    }
    const card = combatState.drawPile.pop();
    if (card) combatState.hand.push(card);
  }
}

export function discardHand(combatState) {
  for (const c of combatState.hand) combatState.discardPile.push(c);
  combatState.hand = [];
}

export function discardCard(combatState, cardInstance) {
  const i = combatState.hand.findIndex((c) => c.uuid === cardInstance.uuid);
  if (i >= 0) combatState.hand.splice(i, 1);
  combatState.discardPile.push(cardInstance);
}

export function exhaustCard(combatState, cardInstance) {
  const i = combatState.hand.findIndex((c) => c.uuid === cardInstance.uuid);
  if (i >= 0) combatState.hand.splice(i, 1);
  combatState.exhaustPile.push(cardInstance);
}

// After combat: return all four piles' contents to the run deck.
// The run deck owns ordering between combats; shuffle happens at next createCombatDeck.
export function returnExhaustToDeck(combatState, runDeck) {
  const all = combatState.drawPile
    .concat(combatState.hand, combatState.discardPile, combatState.exhaustPile);
  // Replace runDeck contents in place (preserving the array reference).
  runDeck.length = 0;
  for (const c of all) runDeck.push(c);
}
