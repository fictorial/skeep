let game;

// DOM elements {{{

let $moveSource;
let $buildPiles = [];
let $cpuHand = [];
let $playerHand = [];
let $cpuDiscardPiles = [];
let $playerDiscardPiles = [];
let $cpuStockPile;
let $playerStockPile;
let $drawPile;
let $title;
let $newGame;

// }}}
// Load elements from page {{{

function _loadElementsFromPage() {
  $title = document.getElementById("title");

  // CPU player

  for (let i = 0; i < 5; ++i)
    $cpuHand[i] = document.getElementById(`cpu-hand-${i}`);

  for (let i = 0; i < 4; ++i)
    $cpuDiscardPiles[i] = document.getElementById(`cpu-discard-${i}`);

  $cpuStockPile = document.getElementById("cpu-stock");

  // Human player

  for (let i = 0; i < 5; ++i) {
    $playerHand[i] = document.getElementById(`player-hand-${i}`);
    $playerHand[i].addEventListener("click", _didClickPlayerHandCard);
  }

  for (let i = 0; i < 4; ++i) {
    $playerDiscardPiles[i] = document.getElementById(`player-discard-${i}`);
    $playerDiscardPiles[i].addEventListener(
      "click",
      _didClickPlayerDiscardPile
    );
  }

  $playerStockPile = document.getElementById("player-stock");
  $playerStockPile.addEventListener("click", _didClickPlayerStockPile);

  // Shared build and draw piles

  for (let i = 0; i < 4; ++i) {
    $buildPiles[i] = document.getElementById(`build-${i}`);
    $buildPiles[i].addEventListener("click", _didClickBuildPile);
  }

  $drawPile = document.getElementById("draw");

  // Controls

  document
    .getElementById("toggle-help")
    .addEventListener("click", _didClickHelp);

  $newGame = document.getElementById("new-game");
  $newGame.addEventListener("click", _didClickNewGame);
}

// }}}
// Toggle element display {{{

function toggleDisplay($el) {
  $el.style.display =
    window.getComputedStyle($el).display === "block" ? "none" : "block";
}

// }}}
// Animation {{{

function animateCSS($el, animationName, callback) {
  const $node = $el || document.querySelector($el);
  $node.classList.add("animated", animationName);

  function handleAnimationEnd() {
    $node.classList.remove("animated", animationName);
    $node.removeEventListener("animationend", handleAnimationEnd);

    if (typeof callback === "function") callback();
  }

  $node.addEventListener("animationend", handleAnimationEnd);
}

// }}}
// Click Help {{{

function _didClickHelp() {
  toggleDisplay(document.getElementById("help"));

  for (let $el of document.getElementsByClassName("help-label"))
    toggleDisplay($el);
}

// }}}
// Click new game {{{

function _didClickNewGame() {
  game = new Game(gameDelegate);
  game.start();
}

// }}}
// Click Player Hand Card {{{

// Human player clicked a card in their own hand with the intent
// of move the selected card to one of the shared build piles or one
// of their own discard piles.
// Rules:
// - Cannot select empty card in hand.
// - Selecting same hand card deselects it.

function _didClickPlayerHandCard(event) {
  if (!game.isActive || !game.currentTurn.player.isHuman) return;

  let $node = event.target;

  let handCardNumber = parseInt($node.id.replace("player-hand-", ""), 10);
  let card = game.humanPlayer.hand.cards[handCardNumber];
  if (!card) return;

  if ($node === $moveSource) {
    $moveSource = null;
    $node.classList.remove("selected");
  } else {
    if ($moveSource) $moveSource.classList.remove("selected");
    $moveSource = $node;
    $node.classList.add("selected");
  }
}

// }}}
// Click Player Discard Pile {{{

// Human player clicked one of their own discard piles.
// If there's a selected card already (move source) in the player's hand,
// that card is discarded.
// If there is no selected card, the top card of the discard pile becomes
// the move source with the intent that the player will click a build pile
// next.
// Rules:
// - No reason to select an empty discard pile as source of card move.
// - Selecting same discard pile deselects it.
// - Discarding a hand card ends the player's turn.

function _didClickPlayerDiscardPile(event) {
  if (!game.isActive || !game.currentTurn.player.isHuman) return;

  let $node = event.target;
  let discardPileNumber = parseInt($node.id.replace("player-discard-", ""), 10);

  if (!$moveSource && game.humanPlayer.discardPiles[discardPileNumber].isEmpty)
    return;

  if ($node === $moveSource) {
    $moveSource = null;
    $node.classList.remove("selected");
  } else if ($moveSource && $moveSource.id.startsWith("player-hand-")) {
    let handCardNumber = parseInt(
      $moveSource.id.replace("player-hand-", ""),
      10
    );

    game.performDiscardAction(
      new DiscardAction(discardPileNumber, handCardNumber)
    );
  } else {
    if ($moveSource) $moveSource.classList.remove("selected");
    $moveSource = $node;
    $node.classList.add("selected");
  }
}

// }}}
// Click Build Pile {{{

// Human player has clicked a shared build pile.
// If a card has been selected (move source), the intent is to moved the selected card to this pile.
// The source may be the player stock pile; or
// the source may be 1 of the 4 player discard piles; or
// the source may be 1 of the 5 cards in the player's hand.

function _didClickBuildPile(event) {
  if (!game.isActive || !game.currentTurn.player.isHuman) return;

  let $node = event.target;

  let buildPileNumber = parseInt($node.id.replace("build-", ""), 10);

  if ($moveSource) {
    if ($moveSource.id === "player-stock") {
      try {
        game.performPlayStockAction(new PlayStockAction(buildPileNumber));
      } catch (e) {
        console.warn(e);
      }
    } else if ($moveSource.id.startsWith("player-hand-")) {
      let handCardNumber = parseInt(
        $moveSource.id.replace("player-hand-", ""),
        10
      );

      try {
        game.performPlayHandAction(
          new PlayHandAction(buildPileNumber, handCardNumber)
        );
      } catch (e) {
        console.warn(e);
      }
    } else if ($moveSource.id.startsWith("player-discard-")) {
      let discardPileNumber = parseInt(
        $moveSource.id.replace("player-discard-", ""),
        10
      );

      try {
        game.performPlayDiscardAction(
          new PlayDiscardAction(buildPileNumber, discardPileNumber)
        );
      } catch (e) {
        console.warn(e);
      }
    }
  }
}

// }}}
//  Click Player Stock Pile {{{

// Clicking the player stock pile selects its top card.

function _didClickPlayerStockPile(event) {
  if (!game.isActive || !game.currentTurn.player.isHuman) return;

  let $node = event.target;

  if ($moveSource) $moveSource.classList.remove("selected");
  $moveSource = $node;
  $node.classList.add("selected");
}

// }}}
// Deselect all selected cards {{{

function _deselectAllCards() {
  for (let $card of document.getElementsByClassName("selected"))
    $card.classList.remove("selected");

  $moveSource = null;
}

// }}}
// Sync a pile's display to data model {{{

function _syncPile(
  $pile,
  pile,
  showEffectiveWildCardValues = false,
  bounce = true
) {
  $pile.classList.remove("selected");

  if (pile.isEmpty) {
    $pile.textContent = null;
    $pile.classList.add("empty");
  } else {
    $pile.classList.remove("empty");

    if (showEffectiveWildCardValues) {
      $pile.textContent = pile.peekTop().number;
    } else {
      $pile.textContent = pile.peekTop().toString();
    }

    if (bounce) animateCSS($pile, "bounce");
  }

  $pile.setAttribute("data-badge", pile.cardCount);
}

// }}}
// Sync a pile's badge display to data model {{{

function _syncDrawPileBadge() {
  $drawPile.setAttribute("data-badge", game.drawPile.cardCount);
}

// }}}
// Hand helpers {{{

function _currentHand() {
  let player = game.currentTurn.player;
  let $hand = player.isHuman ? $playerHand : $cpuHand;
  let hand = player.hand;
  return [$hand, hand];
}

function _currentHandCard(handCardNumber) {
  let [$hand, hand] = _currentHand();
  return [$hand[handCardNumber], hand.cards[handCardNumber]];
}

function _syncCurrentHandCard(handCardNumber) {
  let [$card, card] = _currentHandCard(handCardNumber);

  if (!card) {
    $card.textContent = null;
    $card.classList.remove("selected");
    $card.classList.add("empty");
  } else {
    if (game.currentTurn.player.isHuman) $card.textContent = card.toString();

    $card.classList.remove("empty");
  }

  if (card) animateCSS($card, "bounce");
}

// }}}
// Discard pile helpers {{{

// Returns the DOM element of the given discard pile for the current turn's player
// as well as the model thereof.

function _currentDiscardPile(discardPileNumber) {
  let player = game.currentTurn.player;
  let $discardPile = player.isHuman
    ? $playerDiscardPiles[discardPileNumber]
    : $cpuDiscardPiles[discardPileNumber];
  let discardPile = player.discardPiles[discardPileNumber];
  return [$discardPile, discardPile];
}

// Updates the displayed top card of the given discard pile for the current turn's player
// from the model thereof.

function _syncCurrentDiscardPile(discardPileNumber) {
  let [$discardPile, discardPile] = _currentDiscardPile(discardPileNumber);
  _syncPile($discardPile, discardPile);
}

// }}}
// Stock pile helpers {{{

// Returns the DOM element of the stock pile for the current turn's player
// as well as the model thereof.

function _currentStockPile() {
  let player = game.currentTurn.player;
  let $stockPile = player.isHuman ? $playerStockPile : $cpuStockPile;
  return [$stockPile, player.stockPile];
}

// Updates the displayed top card of the stock pile for the current turn's player
// from the model thereof.

function _syncCurrentStockPile(bounce) {
  let [$stockPile, stockPile] = _currentStockPile();
  _syncPile($stockPile, stockPile, false, bounce);
}

// }}}
// Build pile helpers {{{

// Returns the DOM element of the given build pile as well as the model thereof.

function _buildPile(buildPileNumber) {
  let $buildPile = $buildPiles[buildPileNumber];
  let buildPile = game.buildPiles[buildPileNumber];
  return [$buildPile, buildPile];
}

// Updates the displayed top card of the given build from the model thereof.

function _syncBuildPile(buildPileNumber) {
  let [$buildPile, buildPile] = _buildPile(buildPileNumber);
  _syncPile($buildPile, buildPile, true);
}

// }}}
// CPU turn logic {{{

function _isCPUCurrent() {
  return !game.currentTurn.player.isHuman;
}

// The CPU player can play a card to a build pile if:
// - the card is wild; or
// - the card is 1 more than the top build pile card; or
// - the build pile is empty and the card is a 1.
//
// Returns the build pile number that can be played if any.

function _cpuCanPlayCard(card) {
  for (let i = 0; i < 4; ++i) {
    let buildPile = game.buildPiles[i];

    if (
      (!buildPile.isEmpty && buildPile.peekTop().number + 1 === card.number) ||
      card.isWild ||
      (buildPile.isEmpty && card.number === 1)
    )
      return i;
  }
}

// Determines and submits one game action based on visible game state.  Just
// like the human player, should this CPU player's action not cause the CPU
// player's turn to conclude, this will be called again.
//
// The delay is so the human player can see what is happening at each step.

function _submitNextCPUAction() {
  setTimeout(_nextCPUAction, 1500);
}

// *************************************************************
// There is NO strategy in this current version!
// *************************************************************
// We first try stock pile and if we can play the top card, we do.
// Next, we try our hand cards.
// Next, we try our discard piles' top cards.

function _nextCPUAction() {
  console.log("next cpu action");

  // Can we play from our stock pile to any of the build piles?

  let buildPileNumber = _cpuCanPlayCard(game.cpuPlayer.stockPile.peekTop());
  if (buildPileNumber !== undefined) {
    console.log("cpu plays stock pile to build pile", buildPileNumber);
    game.performPlayStockAction(new PlayStockAction(buildPileNumber));
    return;
  }

  // No, we cannot. Can we play any of our hand cards to any build pile?

  for (let i = 0; i < 5; ++i) {
    let card = game.cpuPlayer.hand.getCard(i);
    if (!card) continue;
    buildPileNumber = _cpuCanPlayCard(card);
    if (buildPileNumber !== undefined) {
      console.log("cpu plays hand card", i, "to build pile", buildPileNumber);
      game.performPlayHandAction(new PlayHandAction(buildPileNumber, i));
      return;
    }
  }

  // No, we cannot. Can we play any of our discard piles' top cards to any build pile?

  for (let discardPileNumber = 0; discardPileNumber < 4; ++discardPileNumber) {
    let discardPile = game.cpuPlayer.discardPiles[discardPileNumber];
    if (discardPile.isEmpty) continue;
    let card = discardPile.peekTop();
    buildPileNumber = _cpuCanPlayCard(card);
    if (buildPileNumber !== undefined) {
      console.log(
        "cpu plays discard pile",
        discardPileNumber,
        "to build pile",
        buildPileNumber
      );

      game.performPlayDiscardAction(
        new PlayDiscardAction(buildPileNumber, discardPileNumber)
      );

      return;
    }
  }

  console.log("cpu cannot play anything; discarding...");

  // No, we cannot. Thus, we have to discard a card from our hand to one of the discard piles.
  // Which card should we discard?  Which pile should we discard to?

  let nonEmptyHandCards = [];

  for (let handCardNumber = 0; handCardNumber < 5; ++handCardNumber) {
    let card = game.cpuPlayer.hand.getCard(handCardNumber);
    if (card !== undefined) nonEmptyHandCards.push({ handCardNumber, card });
  }

  console.log("...nonEmptyHandCards", nonEmptyHandCards);

  // If we have an empty pile we use that discard pile.  We pick the highest
  // value card in our hand so as to build discard piles in descending order which
  // might help with "runs" (9 on a 10 means if we play 9 we can play the 10).

  for (let discardPileNumber = 0; discardPileNumber < 4; ++discardPileNumber) {
    let discardPile = game.cpuPlayer.discardPiles[discardPileNumber];

    if (discardPile.isEmpty) {
      let bestHandCardNumber = -1;
      let maxValue = -1;

      for (let { handCardNumber, card } of nonEmptyHandCards) {
        if (card.isWild) continue;
        if (card.number > maxValue) {
          maxValue = card.number;
          bestHandCardNumber = handCardNumber;
        }
      }

      if (bestHandCardNumber !== -1) {
        console.log(
          "... found empty discard pile",
          discardPileNumber,
          "with best card to discard at",
          bestHandCardNumber
        );

        game.performDiscardAction(
          new DiscardAction(discardPileNumber, bestHandCardNumber)
        );
        return;
      }
    }
  }

  // Else we find all the discard piles whose top card is greater than our hand card.

  let diffs = [];

  for (let { handCardNumber, card } of nonEmptyHandCards) {
    for (
      let discardPileNumber = 0;
      discardPileNumber < 4;
      ++discardPileNumber
    ) {
      let discardPile = game.cpuPlayer.discardPiles[discardPileNumber];
      let topCard = discardPile.peekTop();
      let diff = topCard.isWild ? 1e8 : topCard.number - card.number;
      if (diff > 0) {
        diffs.push({ handCardNumber, discardPileNumber, diff });
      }
    }
  }

  if (diffs.length === 0) {
    // There aren't any discard piles whose top card is greater than any of our hand cards.
    // Thus, we pick a random discard pile.

    let randomHandCardNumberIndex = Math.floor(
      Math.random() * nonEmptyHandCards.length
    );

    let handCardNumber =
      nonEmptyHandCards[randomHandCardNumberIndex].handCardNumber;

    let discardPileNumber = Math.floor(Math.random() * 4);

    console.log(
      "cpu discards",
      handCardNumber,
      "to discard pile",
      discardPileNumber
    );

    game.performDiscardAction(
      new DiscardAction(discardPileNumber, handCardNumber)
    );
  } else {
    // We want the minimum difference between discard pile and hand card.
    // E.g. 10 in discard, 10 in hand is great; 10 vs 9, OK; 10 vs 2, not so good.

    diffs.sort((a, b) => {
      if (a.diff === b.diff) return 0;
      return a.diff < b.diff ? -1 : 1;
    });

    let { handCardNumber, discardPileNumber } = diffs[0];

    console.log(
      "cpu discards",
      handCardNumber,
      "to discard pile",
      discardPileNumber
    );

    game.performDiscardAction(
      new DiscardAction(discardPileNumber, handCardNumber)
    );
  }
}

// }}}
// Game delegate {{{

// The game delegate recieves notifications from the game model and updates the
// UI accordingly.

function callLater(fn, delay = 1000) {
  return (...args) => setTimeout(() => fn(...args), delay);
}

let gameDelegate = {
  gameDidStart() {
    _syncDrawPileBadge();
    
    for (let i = 0; i < 4; ++i) {
      _syncBuildPile(i);
      _syncPile($cpuDiscardPiles[i], game.cpuPlayer.discardPiles[i], true, false)
      _syncPile($playerDiscardPiles[i], game.humanPlayer.discardPiles[i], true, false)
      _syncPile($playerStockPile, game.humanPlayer.stockPile, true, false)
      _syncPile($cpuStockPile, game.cpuPlayer.stockPile, true, false)
    }

  },

  turnDidStart() {
    _deselectAllCards();
    return 1000;
  },

  turnDidEnd() {
    _deselectAllCards();
  },

  // Cards were dealt in the model.  Let's let any animations
  // finish from the previous turn (hence, later).  Then, show
  // the player who's up, animate the dealt cards, update pile counts,
  // and if the CPU is now up, have it play its next action.

  didDealCards: callLater((cardsDrawn, handCardNumbers) => {
    $title.textContent = `${_isCPUCurrent() ? "MY" : "YOUR"} TURN`;
    

    if (_isCPUCurrent()) {
      $title.classList.add('cpu-turn');
    } else {
      $title.classList.remove('my-turn');
    }

    animateCSS($title, "tada", () => {
      $title.classList.remove('my-turn')
      $title.classList.remove('cpu-turn')
    });

    let delay = 0;
    for (let cardNumber of handCardNumbers) {
      let thisDelay = delay;
      delay += 250;
      setTimeout(() => _syncCurrentHandCard(cardNumber), thisDelay);
    }
    
    _syncDrawPileBadge();
    _syncCurrentStockPile(false);

    setTimeout(() => {
      if (_isCPUCurrent()) _submitNextCPUAction();
    }, 1500);
  }),

  didPlayHandCard({ buildPileNumber, handCardNumber }) {
    console.log("delegate.didPlayHandCard");

    _syncBuildPile(buildPileNumber);
    _syncCurrentHandCard(handCardNumber);
    _deselectAllCards();

    if (_isCPUCurrent()) _submitNextCPUAction();
  },

  didPlayStockCard({ buildPileNumber }) {
    _syncBuildPile(buildPileNumber);
    _syncCurrentStockPile();
    _deselectAllCards();

    if (_isCPUCurrent()) _submitNextCPUAction();
  },

  didPlayDiscardCard({ discardPileNumber, buildPileNumber }) {
    _syncBuildPile(buildPileNumber);
    _syncCurrentDiscardPile(discardPileNumber);
    _deselectAllCards();

    if (_isCPUCurrent()) _submitNextCPUAction();
  },

  didDiscardHandCard({ handCardNumber, discardPileNumber }) {
    _syncCurrentDiscardPile(discardPileNumber);
    _syncCurrentHandCard(handCardNumber);
    _deselectAllCards();
  },

  didClearBuildPile(buildPileNumber) {
    setTimeout(() => _syncBuildPile(buildPileNumber), 1000);
  },

  didRecreateDrawPile() {
    _syncDrawPileBadge();
  },

  gameDidEnd() {
    $title.textContent = game.winner.isHuman ? "YOU WIN! 🤘" : "I WON. 🐙";
    animateCSS($title, "tada");
    _deselectAllCards();
  }
};

// }}}
// Card drag and drop {{{

function dragDidStart(ev) {
  if (_isCPUCurrent()) {
    ev.preventDefault();
    return;
  }
  ev.dataTransfer.setData("text/plain", ev.target.id);
  ev.dataTransfer.dropEffect = "move";
  console.log("drag: started dragging", ev.target.id);
}

function dragDidHover(ev) {
  ev.preventDefault();
  if (_isCPUCurrent()) return;
  ev.dataTransfer.dropEffect = "move";
  console.log("drag: over", ev.target.id);
}

function dragDidDrop(ev) {
  ev.preventDefault();
  if (_isCPUCurrent()) return;

  let $node = ev.target;
  let sourceId = ev.dataTransfer.getData("text/plain");

  let buildPileNumber = parseInt($node.id.replace("build-", ""), 10);
  let discardPileNumber = parseInt($node.id.replace("player-discard-", ""), 10);

  if (!isNaN(buildPileNumber)) _didDropOnBuildPile(buildPileNumber, sourceId);
  else if (!isNaN(discardPileNumber))
    _didDropOnDiscardPile(discardPileNumber, sourceId);
}

// Can drag from discard pile, stock pile, or card in hand.

function _didDropOnBuildPile(buildPileNumber, sourceId) {
  if (sourceId === "player-stock") {
    try {
      game.performPlayStockAction(new PlayStockAction(buildPileNumber));
    } catch (e) {
      console.warn(e);
    }
  } else if (sourceId.startsWith("player-hand-")) {
    let handCardNumber = parseInt(sourceId.replace("player-hand-", ""), 10);

    try {
      game.performPlayHandAction(
        new PlayHandAction(buildPileNumber, handCardNumber)
      );
    } catch (e) {
      console.warn(e);
    }
  } else if (sourceId.startsWith("player-discard-")) {
    let discardPileNumber = parseInt(
      sourceId.replace("player-discard-", ""),
      10
    );

    try {
      game.performPlayDiscardAction(
        new PlayDiscardAction(buildPileNumber, discardPileNumber)
      );
    } catch (e) {
      console.warn(e);
    }
  }
}

function _didDropOnDiscardPile(discardPileNumber, sourceId) {
  if (sourceId.startsWith("player-hand-")) {
    let handCardNumber = parseInt(sourceId.replace("player-hand-", ""), 10);

    game.performDiscardAction(
      new DiscardAction(discardPileNumber, handCardNumber)
    );
  }
}

// }}}
// Initialization {{{

// When the DOM is ready, find our elements and start the game.

window.addEventListener("DOMContentLoaded", event => {
  _loadElementsFromPage();

  game = new Game(gameDelegate);
  game.start();
});

// }}}
