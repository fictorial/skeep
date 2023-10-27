let game;

let $moveSource;
let $buildPiles = [];
let $cpuHandRow;
let $cpuDiscardRow;
let $cpuHand = [];
let $humanHand = [];
let $humanHandRow;
let $humanDiscardRow;
let $cpuDiscardPiles = [];
let $humanDiscardPiles = [];
let $discardPileContents;
let $cpuStockPile;
let $humanStockPile;
let $drawPile;
let $appName;
let $humanWins;
let $cpuWins;
let $newGame;

let longPressTimer;
let didLongPress = false;

function _loadElementsFromPage() {
  $appName = document.getElementById("app-name");

  // CPU player

  $cpuWins = document.getElementById("cpu-wins");

  for (let i = 0; i < 5; ++i)
    $cpuHand[i] = document.getElementById(`cpu-hand-${i}`);

  for (let i = 0; i < 4; ++i)
    $cpuDiscardPiles[i] = document.getElementById(`cpu-discard-${i}`);

  $cpuStockPile = document.getElementById("cpu-stock");

  $cpuHandRow = document.getElementById("cpu-hand");
  $cpuDiscardRow = document.getElementById("cpu-discard");

  // Human player

  $humanWins = document.getElementById("human-wins");

  $humanHandRow = document.getElementById("human-hand");
  $humanDiscardRow = document.getElementById("human-discard");

  for (let i = 0; i < 5; ++i) {
    $humanHand[i] = document.getElementById(`human-hand-${i}`);
    $humanHand[i].addEventListener("click", _didClickHumanHandCard);
  }

  for (let i = 0; i < 4; ++i) {
    $humanDiscardPiles[i] = document.getElementById(`human-discard-${i}`);

    $humanDiscardPiles[i].addEventListener('mousedown', () => startLongPressTimer(i));
    $humanDiscardPiles[i].addEventListener('mouseup', endLongPress);
    $humanDiscardPiles[i].addEventListener('touchstart', () => startLongPressTimer(i));
    $humanDiscardPiles[i].addEventListener('touchend', endLongPress);

    $humanDiscardPiles[i].addEventListener("click", _didClickHumanDiscardPile);
  }

  $discardPileContents = document.getElementById("discard-pile-contents");

  $humanStockPile = document.getElementById("human-stock");
  $humanStockPile.addEventListener("click", _didClickHumanStockPile);

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

function toggleDisplay($el) {
  const current = window.getComputedStyle($el).display;
  const next = current === "block" ? "none" : "block";
  $el.style.display = next;
  return next;
}

function animateCSS($el, animationName, callback) {
  const $node = $el || document.querySelector($el);
  $node.classList.add('animated', animationName);

  function handleAnimationEnd() {
    $node.classList.remove('animated', animationName);
    $node.removeEventListener("animationend", handleAnimationEnd);

    if (typeof callback === "function") callback();
  }

  $node.addEventListener("animationend", handleAnimationEnd);
}

function _didClickHelp() {
  const isShown = toggleDisplay(document.getElementById("help"));

  for (let $el of document.getElementsByClassName("help-label"))
    toggleDisplay($el);

  document.body.classList.toggle("overflow");
}

function _didClickNewGame() {
  game = new Game(gameDelegate);
  game.start();
}

// Human player clicked a card in their own hand with the intent
// of move the selected card to one of the shared build piles or one
// of their own discard piles.
// Rules:
// - Cannot select empty card in hand.
// - Selecting same hand card deselects it.

function _didClickHumanHandCard(event) {
  if (!game.isActive || !game.currentTurn.player.isHuman) return;

  let $node = event.target;

  let handCardNumber = parseInt($node.id.replace("human-hand-", ""), 10);
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

function _didClickHumanDiscardPile(event) {
  if (!game.isActive || !game.currentTurn.player.isHuman || didLongPress) return;

  let $node = event.target;
  let discardPileNumber = parseInt($node.id.replace("human-discard-", ""), 10);

  if (!$moveSource && game.humanPlayer.discardPiles[discardPileNumber].isEmpty)
    return;

  if ($node === $moveSource) {
    $moveSource = null;
    $node.classList.remove("selected");
  } else if ($moveSource && $moveSource.id.startsWith("human-hand-")) {
    let handCardNumber = parseInt(
      $moveSource.id.replace("human-hand-", ""),
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
    if ($moveSource.id === "human-stock") {
      try {
        game.performPlayStockAction(new PlayStockAction(buildPileNumber));
      } catch (e) {
        console.warn(e);
      }
    } else if ($moveSource.id.startsWith("human-hand-")) {
      let handCardNumber = parseInt(
        $moveSource.id.replace("human-hand-", ""),
        10
      );

      try {
        game.performPlayHandAction(
          new PlayHandAction(buildPileNumber, handCardNumber)
        );
      } catch (e) {
        console.warn(e);
      }
    } else if ($moveSource.id.startsWith("human-discard-")) {
      let discardPileNumber = parseInt(
        $moveSource.id.replace("human-discard-", ""),
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

// Clicking the player stock pile selects its top card.

function _didClickHumanStockPile(event) {
  if (!game.isActive || !game.currentTurn.player.isHuman) return;

  let $node = event.target;

  if ($moveSource) $moveSource.classList.remove("selected");
  $moveSource = $node;
  $node.classList.add("selected");
}

function _deselectAllCards() {
  for (let $card of document.getElementsByClassName("selected"))
    $card.classList.remove("selected");

  $moveSource = null;
}

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

function _syncDrawPileBadge() {
  $drawPile.setAttribute("data-badge", game.drawPile.cardCount);
}

function _currentHand() {
  let player = game.currentTurn.player;
  let $hand = player.isHuman ? $humanHand : $cpuHand;
  let hand = player.hand;
  return [$hand, hand];
}

function _currentHandCard(handCardNumber) {
  let [$hand, hand] = _currentHand();
  return [$hand[handCardNumber], hand.cards[handCardNumber]];
}

function _syncCard($card, card) {
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

function _syncCurrentHandCard(handCardNumber) {
  let [$card, card] = _currentHandCard(handCardNumber);
  _syncCard($card, card);
}

// Returns the DOM element of the given discard pile for the current turn's player
// as well as the model thereof.

function _currentDiscardPile(discardPileNumber) {
  let player = game.currentTurn.player;
  let $discardPile = player.isHuman
    ? $humanDiscardPiles[discardPileNumber]
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

// Returns the DOM element of the stock pile for the current turn's player
// as well as the model thereof.

function _currentStockPile() {
  let player = game.currentTurn.player;
  let $stockPile = player.isHuman ? $humanStockPile : $cpuStockPile;
  return [$stockPile, player.stockPile];
}

// Updates the displayed top card of the stock pile for the current turn's player
// from the model thereof.

function _syncCurrentStockPile(bounce) {
  let [$stockPile, stockPile] = _currentStockPile();
  _syncPile($stockPile, stockPile, false, bounce);
}

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

function _isCPUCurrent() {
  return !game.currentTurn.player.isHuman;
}

function _isHumanCurrent() {
  return game.currentTurn.player.isHuman;
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

let _nextTimeout;

function _submitNextCPUAction() {
  if (_nextTimeout) clearTimeout(_nextTimeout);
  _nextTimeout = setTimeout(_nextCPUAction, 1000);
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

// The game delegate recieves notifications from the game model and updates the
// UI accordingly.

let gameDelegate = {
  gameDidStart() {
    _syncDrawPileBadge();

    for (let i = 0; i < 4; ++i) {
      _syncBuildPile(i);

      _syncPile(
        $cpuDiscardPiles[i],
        game.cpuPlayer.discardPiles[i],
        true,
        false
      );

      _syncPile(
        $humanDiscardPiles[i],
        game.humanPlayer.discardPiles[i],
        true,
        false
      );
    }

    _syncPile($humanStockPile, game.humanPlayer.stockPile, false, false);
    _syncPile($cpuStockPile, game.cpuPlayer.stockPile, false, false);

    for (let i = 0; i < 5; ++i) {
      _syncCard($humanHand[i], game.humanPlayer.hand[i]);
      _syncCard($cpuHand[i], game.cpuPlayer.hand[i]);
    }
  },

  turnDidStart() {
    _deselectAllCards();

    $humanHandRow.classList.remove("active");
    $humanDiscardRow.classList.remove("active");

    $cpuHandRow.classList.remove("active");
    $cpuDiscardRow.classList.remove("active");

    if (_isCPUCurrent()) {
      $cpuHandRow.classList.add("active");
      $cpuDiscardRow.classList.add("active");

      animateCSS($cpuHandRow, "flash");
      animateCSS($cpuDiscardRow, "flash");
    } else {
      $humanHandRow.classList.add("active");
      $humanDiscardRow.classList.add("active");

      animateCSS($humanHandRow, "flash");
      animateCSS($humanDiscardRow, "flash");
    }

    // Wait for the animation to finish before dealing cards.

    const rootStyles = window.getComputedStyle(document.documentElement);
    const delay = rootStyles.getPropertyValue('--animate-duration').trim();
    return Math.round(parseFloat(delay) * 1.6);
  },

  turnDidEnd() {
    _deselectAllCards();
  },

  // Cards were dealt in the model.  Let's let any animations
  // finish from the previous turn (hence, later).  Then, show
  // the player who's up, animate the dealt cards, update pile counts,
  // and if the CPU is now up, have it play its next action.

  didDealCards: function(cardsDrawn, handCardNumbers) {
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
    }, 1000);

  },

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
    let text = game.winner.isHuman ? "YOU WIN! 🤘" : "I WON. 🐙";
    $appName.textContent = text;
    animateCSS($appName, "tada");

    $humanHandRow.classList.remove("active");
    $cpuHandRow.classList.remove("active");

    if (game.winner.isHuman) _humanDidWin();
    else _cpuDidWin();

    _deselectAllCards();
    _hideDiscardPileDisplay();

    alert(text);
  }
};

function _loadStoredRecord() {
  if (localStorage.getItem("record")) {
    let record = JSON.parse(localStorage.getItem("record"));
    $humanWins.textContent = record.humanWins;
    $cpuWins.textContent = record.cpuWins;
  } else {
    localStorage.setItem("record", JSON.stringify({ humanWins: 0, cpuWins: 0 }));
  }
}

function _withStoredRecord(callback) {
  let record = JSON.parse(localStorage.getItem("record"));
  callback(record);
  localStorage.setItem("record", JSON.stringify(record));
  $humanWins.textContent = record.humanWins;
  $cpuWins.textContent = record.cpuWins;
}

function _humanDidWin() {
  _withStoredRecord(record => record.humanWins++)
}

function _cpuDidWin() {
  _withStoredRecord(record => record.cpuWins++)
}

function dragDidStart(ev) {
  if (_isCPUCurrent()) {
    ev.preventDefault();
    return;
  }

  //if (ev.target.getAnimations().length > 0) {
  //  ev.preventDefault();
  //  return;
  //}

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
  let discardPileNumber = parseInt($node.id.replace("human-discard-", ""), 10);

  if (!isNaN(buildPileNumber)) _didDropOnBuildPile(buildPileNumber, sourceId);
  else if (!isNaN(discardPileNumber))
    _didDropOnDiscardPile(discardPileNumber, sourceId);
}

// Can drag from discard pile, stock pile, or card in hand.

function _didDropOnBuildPile(buildPileNumber, sourceId) {
  if (sourceId === "human-stock") {
    try {
      game.performPlayStockAction(new PlayStockAction(buildPileNumber));
    } catch (e) {
      console.warn(e);
    }
  } else if (sourceId.startsWith("human-hand-")) {
    let handCardNumber = parseInt(sourceId.replace("human-hand-", ""), 10);

    try {
      game.performPlayHandAction(
        new PlayHandAction(buildPileNumber, handCardNumber)
      );
    } catch (e) {
      console.warn(e);
    }
  } else if (sourceId.startsWith("human-discard-")) {
    let discardPileNumber = parseInt(
      sourceId.replace("human-discard-", ""),
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
  if (sourceId.startsWith("human-hand-")) {
    let handCardNumber = parseInt(sourceId.replace("human-hand-", ""), 10);

    game.performDiscardAction(
      new DiscardAction(discardPileNumber, handCardNumber)
    );
  }
}

function startLongPressTimer(pileIndex) {
  clearTimeout(longPressTimer);

  longPressTimer = setTimeout(() => {
    _showDiscardPileContents(pileIndex)
    didLongPress = true;
  }, 400);
}

function endLongPress(event) {
  clearTimeout(longPressTimer);
  longPressTimer = null;

  if (didLongPress) {
    event.preventDefault();

    // Let click handler see that there was a long press.
    setTimeout(() => didLongPress = false, 0);
  }
}

function _showDiscardPileContents(index) {
  const discardPile = game.humanPlayer.discardPiles[index];

  if (discardPile.isEmpty || discardPile.cards.length == 1) return false;

  $discardPileContents.innerHTML = discardPile.cards[1].toString();

  const $pile = document.getElementById(`human-discard-${index}`);
  $pile.style.zIndex = 2;

  // Move the discard pile contents to the exact same position as $pile

  const rect = $pile.getBoundingClientRect();
  $discardPileContents.style.left = `${rect.left}px`;
  $discardPileContents.style.top = `${rect.top}px`;
  $discardPileContents.style.zIndex = 1;
  $discardPileContents.classList.remove('hidden');

  // Slide up since on mobile the user's hand is below.

  animateCSS($pile, 'slideOutLeft',
    () => animateCSS($pile, 'slideInLeft', _hideDiscardPileDisplay));
}

function addAutoRemoveEventListener(target, type, listenerFn, options) {
    function oneTimeListener(event) {
        listenerFn(event);
        target.removeEventListener(type, oneTimeListener, options);
    }
    target.addEventListener(type, oneTimeListener, options);
}

function _hideDiscardPileDisplay() {
  $discardPileContents.classList.add('hidden');
}

// When the DOM is ready, find our elements and start the game.

window.addEventListener("DOMContentLoaded", event => {
  game = new Game(gameDelegate);

  _loadElementsFromPage();
  _loadStoredRecord();

  game.start();
});
