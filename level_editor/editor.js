const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');

// Brettoppsett
let rows = 15;
let cols = 15;
const brickWidth = 60;
const brickHeight = 30;
const brickPadding = 6;
const offsetTop = 60;

// Track last imported file directory
let lastImportedDirectory = null;
let lastImportedFilename = null;

// Beregn nødvendig bredde og høyde
const totalBricksWidth = cols * brickWidth + (cols - 1) * brickPadding;
const totalBricksHeight = rows * brickHeight + (rows - 1) * brickPadding + offsetTop + 20;

canvas.width = totalBricksWidth + 40; // 20px margin på hver side
canvas.height = totalBricksHeight;
let offsetLeft = (canvas.width - totalBricksWidth) / 2;

// Mulige typer
const BRICK_TYPES = ["normal", "special", "sausage", "extra", "glass", "strong"];

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
      if (brick.type === "strong") color = "#8B4513";
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
        } else if (type === "strong") {
          brick.strength = 2;
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
window.exportLevel = async function() {
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
  
  try {
    // Try to use modern File System Access API for better file dialog
    if ('showSaveFilePicker' in window) {
      await exportWithFileSystemAPI(exportObj);
    } else {
      // Fallback to traditional method with enhanced dialog
      exportWithTraditionalMethod(exportObj);
    }
  } catch (error) {
    console.error('Export failed:', error);
    // Fallback to traditional method if modern API fails
    exportWithTraditionalMethod(exportObj);
  }
};

// Modern File System Access API method
async function exportWithFileSystemAPI(exportObj) {
  const options = {
    suggestedName: lastImportedFilename || 'level.json',
    types: [{
      description: 'JSON Level File',
      accept: {
        'application/json': ['.json']
      }
    }]
  };
  
  try {
    const fileHandle = await window.showSaveFilePicker(options);
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(exportObj, null, 2));
    await writable.close();
    console.log('Level exported successfully using File System Access API');
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Export cancelled by user');
    } else {
      throw error;
    }
  }
}

// Traditional method with enhanced dialog
function exportWithTraditionalMethod(exportObj) {
  // Generate suggested filename based on imported file
  let suggestedName = 'level.json';
  if (lastImportedFilename) {
    // If we imported a file, suggest a similar name
    const baseName = lastImportedFilename.replace(/\.json$/i, '');
    suggestedName = `${baseName}_modified.json`;
  }
  
  // Create a more sophisticated dialog
  const dialogHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
      <div style="background: white; padding: 20px; border-radius: 8px; min-width: 300px;">
        <h3 style="margin-top: 0;">Save Level</h3>
        <label for="filename-input">Filename:</label><br>
        <input type="text" id="filename-input" value="${suggestedName}" style="width: 100%; padding: 8px; margin: 8px 0; border: 1px solid #ccc; border-radius: 4px;"><br>
        <div style="margin-top: 15px; text-align: right;">
          <button id="cancel-btn" style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ccc; background: #f0f0f0; cursor: pointer;">Cancel</button>
          <button id="save-btn" style="padding: 8px 16px; border: 1px solid #007cba; background: #007cba; color: white; cursor: pointer;">Save</button>
        </div>
      </div>
    </div>
  `;
  
  // Add dialog to page
  const dialogContainer = document.createElement('div');
  dialogContainer.innerHTML = dialogHTML;
  document.body.appendChild(dialogContainer);
  
  const filenameInput = dialogContainer.querySelector('#filename-input');
  const saveBtn = dialogContainer.querySelector('#save-btn');
  const cancelBtn = dialogContainer.querySelector('#cancel-btn');
  
  // Focus on filename input
  filenameInput.focus();
  filenameInput.select();
  
  // Handle save button
  saveBtn.addEventListener('click', function() {
    const filename = filenameInput.value.trim();
    if (!filename) {
      alert('Please enter a filename');
      return;
    }
    
    // Ensure .json extension
    const finalFilename = filename.endsWith('.json') ? filename : filename + '.json';
    
    // Check if file exists (basic check - can't actually check file system)
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", finalFilename);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    
    // Remove dialog
    document.body.removeChild(dialogContainer);
    console.log(`Level exported as: ${finalFilename}`);
  });
  
  // Handle cancel button
  cancelBtn.addEventListener('click', function() {
    document.body.removeChild(dialogContainer);
  });
  
  // Handle Enter key
  filenameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });
  
  // Handle Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      cancelBtn.click();
    }
  });
}

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
  
  // Store file information for export
  lastImportedFilename = file.name;
  lastImportedDirectory = file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(0, -1).join('/') : null;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      
      // Detect array size from loaded data
      let loadedBricks = data.bricks || data;
      const detectedRows = loadedBricks.length;
      const detectedCols = loadedBricks[0] ? loadedBricks[0].length : 15;
      
      console.log(`Loaded level size: ${detectedRows}x${detectedCols}, upgrading to 15x15...`);
      
      // Always upgrade to 15x15
      rows = 15;
      cols = 15;
      
      // Recalculate canvas dimensions for 15x15
      const totalBricksWidth = cols * brickWidth + (cols - 1) * brickPadding;
      const totalBricksHeight = rows * brickHeight + (rows - 1) * brickPadding + offsetTop + 20;
      
      canvas.width = totalBricksWidth + 40;
      canvas.height = totalBricksHeight;
      
      // Update offset
      offsetLeft = (canvas.width - totalBricksWidth) / 2;
      
      // Reinitialize bricks array with 15x15 size
      initBricks();
      
      // Load bricks data and upgrade to 15x15
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r < detectedRows && c < detectedCols && loadedBricks[r] && loadedBricks[r][c]) {
            // Copy existing brick data
            const loadedBrick = loadedBricks[r][c];
            bricks[r][c] = {
              type: loadedBrick.type || "normal",
              destroyed: loadedBrick.destroyed || false,
              strength: loadedBrick.strength || 1,
              bonusScore: loadedBrick.bonusScore || false,
              extraBall: loadedBrick.extraBall || false,
              special: loadedBrick.special || false,
              effect: loadedBrick.effect || null
            };
          } else {
            // Fill expanded areas with normal bricks
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
      }
      
      // Set background image if field exists
      if (data.background) {
        document.getElementById('bg-url').value = data.background;
      }
      
      drawBricks();
      console.log(`Successfully upgraded level to 15x15. Original: ${detectedRows}x${detectedCols}`);
      
    } catch (err) {
      alert("Kunne ikke laste level: " + err.message);
      console.error("Error loading level:", err);
    }
  };
  reader.readAsText(file);
});