function toggle(e) {
  e.style.display = window.getComputedStyle(e).display === "block" ? "none" : "block"
}

let game

let delegate = {
  
}

window.addEventListener('DOMContentLoaded', (event) => {
  document.getElementById('toggle-help').addEventListener('click', () => {
    toggle(document.getElementById('help'));
    for (let e of document.getElementsByClassName('help-label')) toggle(e)
  });
  
  game = new Game(delegate)  
});