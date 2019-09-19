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
}

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

/**
 * A pile of cards that is numbered relative to sibling piles.
 */

class NumberedPile extends Pile {
  constructor(number) {
    super();
    this.number = number;
  }
}

/**
 * A discard pile is a pile of cards owned by a single player.
 * Any card may be placed atop any other card in a discard pile.
 */

class DiscardPile extends NumberedPile {}

/**
 * A build pile is a pile of cards that are built in
 * a sequence from 1 to 12 with any number of wilds.
 *
 * Build piles are shared between players.
 */

class BuildPile extends NumberedPile {
  willPushCard(card) {
    if (card.isWild || this.peekTop().number + 1 === card.number) return;

    throw new Error("cannot push card");
  }

  didPushCard(card) {
    if (card.isWild) card.number = this.cardCount;
  }
}

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
}

/**
 * A player has a hand, 4 discard piles, and one stock pile.
 */

class Player {
  constructor(name) {
    this.name = name;
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

/**
 * A player's turn in a game consists of a sequence of
 * validated actions.  These actions are processed by the game
 * to drive updates to the game state.
 */

class Turn {
  constructor(player) {
    this.actions = [];
  }

  addAction(action) {
    this.actions.push(action);
  }
}

/**
 * Player plays a card from their hand to one of the shared build piles.
 */

class PlayHandAction {
  constructor(buildPileNumber, handCardNumber) {
    this.buildPileNumber = buildPileNumber;
    this.handCardNumber = handCardNumber;
  }
}

/**
 * Player plays a card from one of their discard piles to one of the shared build piles.
 */

class PlayDiscardAction {
  constructor(buildPileNumber, discardPileNumber) {
    this.buildPileNumber = buildPileNumber;
    this.discardPileNumber = discardPileNumber;
  }
}

/**
 * Player plays a card from their stock pile to one of the shared build piles.
 */

class PlayStockAction {
  constructor(buildPileNumber) {
    this.buildPileNumber = buildPileNumber;
  }
}

/**
 * Player discards a card from their hand to one of their discard piles.
 */

class DiscardAction {
  constructor(discardPileNumber, handCardNumber) {
    this.discardPileNumber = discardPileNumber;
    this.handCardNumber = handCardNumber;
  }
}

/**
 * A game consists of 2 players, a shared draw pile,
 * and 4 shared build piles.
 */

class Game {
  /**
   * The delegate is notified when game state changes occur.
   *
   * - `.gameDidStart()`
   * - `.gameDidEnd(winningPlayer)`
   * - `.turnDidStart(turn, cardsDrawn, handCardNumbers)`
   * - `.turnDidEnd(this.currentTurn)`
   * - `.playedHandCard(player, action)`
   * - `.playedStockCard(player, action)`
   * - `.playedDiscardCard(player, action)`
   * - `.didDiscard(player, action)`
   * - `.didClearBuildPile(buildPile)`
   * - `.didUseCompletedBuildCards()`
   *
   * If `shortGame` is true, each player gets fewer cards at the outset.
   */

  constructor(delegate, shortGame = false) {
    this.delegate = delegate;

    this.cpuPlayer = new Player("CPU");
    this.humanPlayer = new Player("1UP");

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

    for (let i = 0; i < shortGame ? 10 : 30; ++i) {
      this.humanPlayer.stockPile.pushCard(this.drawPile.popTopCard());
      this.cpuPlayer.stockPile.pushCard(this.drawPile.popTopCard());
    }

    this.isActive = true;

    if (this.delegate) {
      this.delegate.gameDidStart();
    }

    this.turns = [];
    this._addTurn(new Turn(this.humanPlayer));
  }

  get currentTurn() {
    return this.turns[this.turns.length - 1];
  }

  _addTurn(turn) {
    this.turns.push(turn);

    // Players must have 5 cards in their hand at the start of their turn.
    // If they do not, they are automatically drawn the needed number of cards
    // from the shared draw pile.

    let handCardNumbers = turn.player.hand.emptyCardIndexes;
    let cardsDrawn = [];

    for (let index of handCardNumbers) {
      let card;
      try {
        card = this.drawPile.popTopCard();
      } catch (e) {
        if (e.message === "empty") {
          this.drawPile = this.completedBuildPileCards;
          this.drawPile.shuffle();
          this.completedBuildPileCards = [];

          card = this.drawPile.popTopCard();

          if (this.delegate) this.delegate.didUseCompletedBuildCards();
        } else {
          throw e;
        }
      }

      turn.player.hand.setCard(index, card);
      cardsDrawn.push(card);
    }

    this.delegate.turnDidStart(turn, cardsDrawn, handCardNumbers);
  }

  _endCurrentTurn() {
    if (this.delegate) this.delegate.turnDidEnd(this.currentTurn);

    let nextPlayer =
      this.currentTurn.player === this.humanPlayer
        ? this.cpuPlayer
        : this.humanPlayer;

    this._addTurn(new Turn(nextPlayer));
  }

  /**
   * Validate and perform given player action to drive game state changes.
   */

  performAction(action) {
    if (!this.isActive) throw new Error("game has ended");

    let player = this.currentTurn.player;

    if (action instanceof PlayHandAction) {
      let handCard = player.hand.getCard(action.handCardNumber);
      let buildPile = this.buildPiles[action.buildPileNumber];
      buildPile.pushCard(handCard);
      player.hand.removeCard(action.handCardNumber);
      if (this.delegate) this.delegate.playedHandCard(player, action);
      this._didPlayCard(buildPile);
    } else if (action instanceof PlayStockAction) {
      let stockCard = player.stockPile.peekTop();
      let buildPile = this.buildPiles[action.buildPileNumber];
      buildPile.pushCard(stockCard);
      player.stockPile.popTopCard();
      if (this.delegate) this.delegate.playedStockCard(player, action);
      this._didPlayCard(buildPile);
      this._checkGameOver();
    } else if (action instanceof PlayDiscardAction) {
      let discardPile = player.discardPiles[action.discardPileNumber];
      let discardCard = discardPile.peekTop();
      let buildPile = this.buildPiles[action.buildPileNumber];
      buildPile.pushCard(discardCard);
      discardPile.popTopCard();
      if (this.delegate) this.delegate.playedDiscardCard(player, action);
      this._didPlayCard(buildPile);
    } else if (action instanceof DiscardAction) {
      const handCard = player.hand.removeCard(action.handCardNumber);
      let discardPile = player.discardPiles[action.discardPileNumber];
      discardPile.pushCard(handCard);
      if (this.delegate) this.delegate.didDiscard(player, action);
      this._endTurn();
    } else {
      throw new Error("unsupported action");
    }
  }

  _didPlayCard(buildPile) {
    if (buildPile.peekTop().number === 12) {
      for (let card in buildPile.cards) this.completedBuildPileCards.push(card);
      buildPile.cards = [];

      if (this.delegate) this.delegate.didClearBuildPile(buildPile);
    }
  }

  _checkGameOver() {
    let player = this.currentTurn.player;
    if (player.stockPile.isEmpty) {
      this.isActive = false;
      if (this.delegate) this.delegate.gameDidEnd(player);
    }
  }
}

