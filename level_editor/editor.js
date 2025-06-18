const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');

// Brettoppsett
const rows = 9;
const cols = 15;
const brickWidth = 60;
const brickHeight = 30;
const brickPadding = 6;
const offsetTop = 60;

// Beregn nødvendig bredde og høyde
const totalBricksWidth = cols * brickWidth + (cols - 1) * brickPadding;
const totalBricksHeight = rows * brickHeight + (rows - 1) * brickPadding + offsetTop + 20;

canvas.width = totalBricksWidth + 40; // 20px margin på hver side
canvas.height = totalBricksHeight;
const offsetLeft = (canvas.width - totalBricksWidth) / 2;

// Mulige typer
const BRICK_TYPES = ["normal", "special", "sausage", "extra", "glass"];

// Brettdata
let bricks = [];
function initBricks() {
  bricks = [];
  for (let r = 0; r < rows; r++) {
    let row = [];
    for (let c = 0; c < cols; c++) {
      row.push({ type: "normal", destroyed: false });
    }
    bricks.push(row);
  }
}
initBricks();

// Tegn brettet
function drawBricks() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const brick = bricks[r][c];
      if (brick.destroyed) continue;
      let color = "#fff";
      if (brick.type === "special") color = "#f00";
      if (brick.type === "sausage") color = "gold";
      if (brick.type === "extra") color = "#0af";
      if (brick.type === "glass") color = "#87CEEB";
      ctx.fillStyle = color;
      ctx.fillRect(
        offsetLeft + c * (brickWidth + brickPadding),
        offsetTop + r * (brickHeight + brickPadding),
        brickWidth, brickHeight
      );
      ctx.strokeStyle = "#222";
      ctx.strokeRect(
        offsetLeft + c * (brickWidth + brickPadding),
        offsetTop + r * (brickHeight + brickPadding),
        brickWidth, brickHeight
      );
    }
  }
}
drawBricks();

// Klikk for å sette/endre murstein
// ...eksisterende kode...

// Oppdatert: Sett riktige felter når du endrer type
canvas.addEventListener('click', function(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = offsetLeft + c * (brickWidth + brickPadding);
      const by = offsetTop + r * (brickHeight + brickPadding);
      if (
        x > bx && x < bx + brickWidth &&
        y > by && y < by + brickHeight
      ) {
        const type = document.getElementById('brick-type').value;
        // Sett alle felter riktig
        let brick = {
          type,
          destroyed: false,
          strength: 1,
          bonusScore: false,
          extraBall: false,
          special: false,
          effect: null
        };
        if (type === "special") {
          brick.special = true;
          brick.strength = 3; // eller 1 hvis du vil ha svak spesial
          brick.effect = Math.random() < 0.5 ? "extend" : "shrink";
        } else if (type === "sausage") {
          brick.bonusScore = true;
          brick.strength = 1;
        } else if (type === "extra") {
          brick.extraBall = true;
          brick.strength = 1;
        } else if (type === "glass") {
          brick.strength = 1;
          brick.bonusScore = false;
          brick.extraBall = false;
        }
        bricks[r][c] = brick;
        drawBricks();
        return;
      }
    }
  }
});

// Eksporter til JSON med alle felter
window.exportLevel = function() {
  const bgFile = document.getElementById('bg-file');
  const bgUrl = bgFile.files.length > 0 ? bgFile.files[0].name : "";
  const level = bricks.map(row => row.map(brick => ({
    type: brick.type,
    destroyed: false,
    strength: brick.strength,
    bonusScore: brick.bonusScore,
    extraBall: brick.extraBall,
    special: brick.special,
    effect: brick.effect
  })));
  const exportObj = {
    background: bgUrl ? `./assets/images/levels/${bgUrl}` : "",
    bricks: level
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "level.json");
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
};

// Tøm brett (fyll med vanlige brikker)
window.clearBricks = function() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      bricks[r][c] = {
        type: "normal",
        destroyed: false,
        strength: 1,
        bonusScore: false,
        extraBall: false,
        special: false,
        effect: null
      };
    }
  }
  drawBricks();
};

// Laste inn level fra JSON-fil
document.getElementById('level-file').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      // Støtter både nytt og gammelt format
      let loadedBricks = data.bricks || data;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (loadedBricks[r] && loadedBricks[r][c]) {
            bricks[r][c] = { ...bricks[r][c], ...loadedBricks[r][c] };
          }
        }
      }
      // Sett bakgrunnsbilde hvis feltet finnes
      if (data.background) {
        document.getElementById('bg-url').value = data.background;
      }
      drawBricks();
    } catch (err) {
      alert("Kunne ikke laste level: " + err.message);
    }
  };
  reader.readAsText(file);
});