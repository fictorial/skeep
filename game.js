// Card {{{

/**
 * A playing card. Each card has a numeric value.
 * A card may be "wild" mean means that the numeric value is
 * arbitrary depending on context.
 */

class Card {
  constructor(number, isWild = false) {
    this.number = number;
    this.isWild = isWild;
  }

  toString() {
    return this.isWild ? "W" : String(this.number);
  }
}

// }}}
// Pile {{{

/**
 * A pile or stack of cards.
 */

class Pile {
  constructor() {
    this.cards = [];
  }

  /**
   * Add a card to the top of the pile.
   */

  pushCard(card) {
    this.willPushCard(card);
    this.cards.push(card);
    this.didPushCard(card);
  }

  willPushCard(card) {}
  didPushCard(card) {}

  /**
   * Remove the card at the top of the pile and return it.
   */

  popTopCard() {
    if (this.cards.length === 0) throw new Error("empty");
    return this.cards.pop();
  }

  get cardCount() {
    return this.cards.length;
  }

  get isEmpty() {
    return this.cardCount === 0;
  }

  /**
   * View but do not remove the card at top of the pile
   * and return it.
   */

  peekTop() {
    if (this.cards.length === 0) throw new Error("empty");
    return this.cards[this.cards.length - 1];
  }

  /**
   * Shuffle the cards in the pile into a random order.
   */

  shuffle() {
    let a = this.cards;
    let n = a.length;
    while (n > 0) {
      let i = Math.floor(Math.random() * n);
      --n;
      let x = a[n];
      a[n] = a[i];
      a[i] = x;
    }
  }
}

// }}}
// NumberedPile {{{

/**
 * A pile of cards that is numbered relative to sibling piles.
 */

class NumberedPile extends Pile {
  constructor(number) {
    super();
    this.number = number;
  }
}

// }}}
// DiscardPile {{{

/**
 * A discard pile is a pile of cards owned by a single player.
 * Any card may be placed atop any other card in a discard pile.
 */

class DiscardPile extends NumberedPile {}

// }}}
// BuildPile {{{

/**
 * A build pile is a pile of cards that are built in
 * a sequence from 1 to 12 with any number of wilds.
 *
 * Build piles are shared between players.
 */

class BuildPile extends NumberedPile {
  willPushCard(card) {
    if (
      card.isWild ||
      (this.isEmpty && card.number === 1) ||
      (!this.isEmpty && this.peekTop().number + 1 === card.number)
    )
      return;

    throw new Error("cannot push card");
  }

  didPushCard(card) {
    if (card.isWild) card.number = this.cardCount;
  }
}

// }}}
// Hand {{{

/**
 * A player's hand consists of at most 5 cards.
 */

class Hand {
  constructor() {
    this.cards = [undefined, undefined, undefined, undefined, undefined];
  }

  /**
   * Get/view the card at index `i`.
   * Returns undefined if there is no card at given index.
   */

  getCard(i) {
    return this.cards[i];
  }

  /**
   * Set the card at index `i`.
   */

  setCard(i, card) {
    this.cards[i] = card;
  }

  /**
   * Remove the card at index `i` and return it.
   */

  removeCard(i) {
    let card = this.getCard(i);
    this.setCard(i, undefined);
    return card;
  }

  /**
   * Returns the indexes (0-4) of the hand slots that have no card.
   */

  get emptyCardIndexes() {
    const indexes = [];

    for (let i = 0, n = this.cards.length; i < n; ++i) {
      if (this.cards[i] === undefined) indexes.push(i);
    }

    return indexes;
  }

  get emptyCardCount() {
    return this.emptyCardIndexes.length;
  }
}

// }}}
// Player {{{

/**
 * A player has a hand, 4 discard piles, and one stock pile.
 */

class Player {
  constructor(name, isHuman = false) {
    this.name = name;
    this.isHuman = isHuman;
    this.hand = new Hand();

    this.discardPiles = [
      new DiscardPile(0),
      new DiscardPile(1),
      new DiscardPile(2),
      new DiscardPile(3)
    ];

    this.stockPile = new Pile();
  }
}

// }}}
// Turn {{{

/**
 * A player's turn in a game consists of a sequence of
 * validated actions.  These actions are processed by the game
 * to drive updates to the game state.
 */

class Turn {
  constructor(player) {
    this.player = player;
    this.actions = [];
  }

  addAction(action) {
    this.actions.push(action);
  }
}

// }}}
// PlayHandAction {{{

/**
 * Player plays a card from their hand to one of the shared build piles.
 */

class PlayHandAction {
  constructor(buildPileNumber, handCardNumber) {
    this.buildPileNumber = buildPileNumber;
    this.handCardNumber = handCardNumber;
  }
}

// }}}
// PlayDiscardAction {{{

/**
 * Player plays a card from one of their discard piles to one of the shared build piles.
 */

class PlayDiscardAction {
  constructor(buildPileNumber, discardPileNumber) {
    this.buildPileNumber = buildPileNumber;
    this.discardPileNumber = discardPileNumber;
  }
}

// }}}
// PlayStockAction {{{

/**
 * Player plays a card from their stock pile to one of the shared build piles.
 */

class PlayStockAction {
  constructor(buildPileNumber) {
    this.buildPileNumber = buildPileNumber;
  }
}

// }}}
// DiscardAction {{{

/**
 * Player discards a card from their hand to one of their discard piles.
 */

class DiscardAction {
  constructor(discardPileNumber, handCardNumber) {
    this.discardPileNumber = discardPileNumber;
    this.handCardNumber = handCardNumber;
  }
}

// }}}
// Game {{{

/**
 * A game consists of 2 players, a shared draw pile,
 * and 4 shared build piles.
 */

class Game {
  // delegate info {{{

  /**
   * The delegate is notified when game state changes occur.
   *
   * - `.gameDidStart()`
   * - `.gameDidEnd()`
   * - `.turnDidStart() -> delayBeforeDealingNext`
   * - `.turnDidEnd()`
   * - `.didDealCards(cardsDrawn, handCardNumbers)`
   * - `.didPlayHandCard(action)`
   * - `.didPlayStockCard(action)`
   * - `.didPlayDiscardCard(action)`
   * - `.didDiscardHandCard(action)`
   * - `.didClearBuildPile(buildPileNumber)`
   * - `.didRecreateDrawPile()`
   * - `.didDealFreshHand(cardsDrawn)`
   *
   * If `shortGame` is true, each player gets fewer cards at the outset.
   */

  // }}}
  // constructor {{{

  constructor(delegate, shortGame = false) {
    this.delegate = delegate;

    this.cpuPlayer = new Player("CPU");
    this.humanPlayer = new Player("1UP", true);

    this.buildPiles = [
      new BuildPile(0),
      new BuildPile(1),
      new BuildPile(2),
      new BuildPile(3)
    ];

    this.completedBuildPileCards = [];

    this.drawPile = new Pile();

    // Create 12 x 1-12 cards

    for (let i = 0; i < 12; ++i) {
      for (let j = 1; j <= 12; ++j) {
        this.drawPile.pushCard(new Card(j));
      }
    }

    // Create wild cards

    for (let i = 0; i < 18; ++i) {
      this.drawPile.pushCard(new Card(0, true));
    }

    this.drawPile.shuffle();

    // 2-player games (CPU vs Human) get N cards each as their stock.

    let cardsToDeal = shortGame ? 10 : 30;

    for (let i = 0; i < cardsToDeal; ++i) {
      this.humanPlayer.stockPile.pushCard(this.drawPile.popTopCard());
      this.cpuPlayer.stockPile.pushCard(this.drawPile.popTopCard());
    }

    this.isActive = false;
    this.winner = null;

    this.turns = [];

    // Short draw pile for testing
    // this.drawPile.cards = this.drawPile.cards.slice(0, 12);
  }

  // }}}

  start() {
    if (this.isActive) return;
    this.isActive = true;
    if (this.delegate) this.delegate.gameDidStart();
    this._addTurn(new Turn(this.humanPlayer));
  }

  get currentTurn() {
    return this.turns[this.turns.length - 1];
  }

  // _drawHandCardsAsNeeded {{{

  // Add cards from draw pile to current player's hand so they have 5 cards.
  //
  // If the draw pile becomes empty, shuffle the cards
  // collected when a build pile is completed (1-12 placed) and use those as
  // the new draw pile.
  //
  // If there are still too few cards, deal what we can.

  _drawHandCardsAsNeeded() {
    let hand = this.currentTurn.player.hand;

    let handCardNumbers = hand.emptyCardIndexes;
    if (handCardNumbers.length === 0) return;

    let cardsDrawn = [];

    for (let index of handCardNumbers) {
      let card;

      if (this.drawPile.isEmpty && this.completedBuildPileCards.length > 0) {
        console.log(
          "using completed build pile cards as new draw pile as draw pile is depleted"
        );

        this.drawPile.cards = this.completedBuildPileCards;
        this.drawPile.shuffle();
        this.completedBuildPileCards = [];

        if (this.delegate) this.delegate.didRecreateDrawPile();
      }

      try {
        card = this.drawPile.popTopCard();
      } catch (e) {
        if (e.message === "empty") {
          break;
        } else {
          throw e;
        }
      }

      hand.setCard(index, card);
      cardsDrawn.push(card);
    }

    return { cardsDrawn, handCardNumbers };
  }

  // }}}

  _addTurn(turn) {
    this.turns.push(turn);
    if (this.delegate) this.delegate.turnDidStart();
    this._dealCards();
  }

  _dealCards() {
    // Players must have 5 cards in their hand at the start of their turn.
    // If they do not, they are automatically drawn the needed number of cards
    // from the shared draw pile.

    let { cardsDrawn, handCardNumbers } = this._drawHandCardsAsNeeded();
    if (this.delegate) this.delegate.didDealCards(cardsDrawn, handCardNumbers);
  }

  _endCurrentTurn() {
    console.log("game._endCurrentTurn");

    if (this.delegate) this.delegate.turnDidEnd();

    let nextPlayer =
      this.currentTurn.player === this.humanPlayer
        ? this.cpuPlayer
        : this.humanPlayer;

    this._addTurn(new Turn(nextPlayer));
  }

  // performPlayHandAction {{{

  /**
   * Current player moves a card from their hand to a build pile.
   */

  performPlayHandAction(action) {
    if (!this.isActive) throw new Error("game has ended");
    let player = this.currentTurn.player;

    let handCard = player.hand.getCard(action.handCardNumber);
    let buildPile = this.buildPiles[action.buildPileNumber];

    buildPile.pushCard(handCard);
    player.hand.removeCard(action.handCardNumber);

    if (this.delegate) this.delegate.didPlayHandCard(action);
    this._didPlayCard(buildPile, action.buildPileNumber);

    // If a player plays all 5 cards from their hand, they are dealt 5
    // more cards immediately.

    if (player.hand.emptyCardCount === 5) {
      // TBD draw deck might be empty...
      let { cardsDrawn, handCardNumbers } = this._drawHandCardsAsNeeded();
      this.delegate.didDealCards(cardsDrawn, handCardNumbers);
    }
  }

  // }}}
  // performPlayStockAction {{{

  /**
   * Current player moves the top card from their stock pile to a build pile.
   */

  performPlayStockAction(action) {
    if (!this.isActive) throw new Error("game has ended");
    let player = this.currentTurn.player;

    let stockCard = player.stockPile.peekTop();
    let buildPile = this.buildPiles[action.buildPileNumber];

    buildPile.pushCard(stockCard);
    player.stockPile.popTopCard();

    if (this.delegate) this.delegate.didPlayStockCard(action);
    this._didPlayCard(buildPile, action.buildPileNumber);

    // The only time a player can win is when they play all of their stock pile cards.
    // One was just played so check if the player won.

    this._checkGameOver();
  }

  // }}}
  // performPlayDiscardAction {{{

  /**
   * Current player moves the top card from one of their discard piles to a build pile.
   */

  performPlayDiscardAction(action) {
    if (!this.isActive) throw new Error("game has ended");
    let player = this.currentTurn.player;

    let discardPile = player.discardPiles[action.discardPileNumber];
    let discardCard = discardPile.peekTop();
    let buildPile = this.buildPiles[action.buildPileNumber];

    buildPile.pushCard(discardCard);
    discardPile.popTopCard();

    if (this.delegate) this.delegate.didPlayDiscardCard(action);
    this._didPlayCard(buildPile, action.buildPileNumber);
  }

  // }}}
  // performDiscardAction {{{

  /**
   * Current player moves a card from their hand to one of their discard piles.
   *
   * This ends the current player's turn.
   */

  performDiscardAction(action) {
    console.log("game.performDiscardAction");

    if (!this.isActive) throw new Error("game has ended");
    let player = this.currentTurn.player;

    let handCard = player.hand.removeCard(action.handCardNumber);
    let discardPile = player.discardPiles[action.discardPileNumber];

    discardPile.pushCard(handCard);

    if (this.delegate) this.delegate.didDiscardHandCard(action);
    this._endCurrentTurn();
  }

  // }}}

  _didPlayCard(buildPile, buildPileNumber) {
    // Remove cards from build piles that finish the sequence of 1 to 12.
    // We reuse these cards should we run out of cards in the draw pile.

    if (buildPile.peekTop().number === 12) {
      while (!buildPile.isEmpty)
        this.completedBuildPileCards.push(buildPile.popTopCard());

      if (this.delegate) this.delegate.didClearBuildPile(buildPileNumber);
    }
  }

  _checkGameOver() {
    let player = this.currentTurn.player;

    if (player.stockPile.isEmpty) {
      this.isActive = false;
      this.winner = player;

      if (this.delegate) this.delegate.gameDidEnd();
    }
  }
}

// }}}
