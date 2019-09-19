window.addEventListener('DOMContentLoaded', (event) => {
  document.getElementById('toggle-help').addEventListener('click', () => {
    let help = document.getElementById('help');
    help.style.visibility = help.style.visibility === "visible" ? "hidden" : "visible"
  });
  
  
});