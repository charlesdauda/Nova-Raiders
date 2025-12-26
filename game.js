const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

// UI
const intro = document.getElementById("intro-screen");
const startBtn = document.getElementById("start-btn");
const hud = document.getElementById("hud");
const gameOverScreen = document.getElementById("game-over");
const rebootBtn = document.getElementById("reboot-btn");

const scoreEl = document.getElementById("score");
const killsEl = document.getElementById("kills");
const finalScoreEl = document.getElementById("finalScore");

// STATE
let running = false;
let score = 0;
let kills = 0;
let health = 6; // 3 hearts, 2 points per heart
let mode = "normal"; // normal, scatter, railgun

// PLAYER
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 14,
  speed: 4
};

// INPUT
let mouse = { x: player.x, y: player.y };
let shooting = false;
let lastShot = 0;
const fireRate = 200; // ms

window.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "s") shooting = true;
  if (e.key.toLowerCase() === "shift") mode = "scatter";
  if (e.key.toLowerCase() === "r") mode = "railgun";
});
window.addEventListener("keyup", e => {
  if (e.key.toLowerCase() === "s") shooting = false;
  if (["shift","r"].includes(e.key.toLowerCase())) mode = "normal";
});

// AUDIO
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function hitBeep() { // player hit
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 180;
  osc.type = "square";
  gain.gain.value = 0.1;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}
function enemyHitSound() { // enemy hit
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 400;
  osc.type = "sawtooth";
  gain.gain.value = 0.1;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

// OBJECTS
const bullets = [];
const enemies = [];
const stars = Array.from({ length: 120 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  z: Math.random() * 2 + 0.5
}));

startBtn.onclick = () => {
  intro.style.display = "none";
  canvas.style.display = "block";
  hud.style.display = "flex";
  running = true;
  loop();
};

function shoot() {
  const now = Date.now();
  if (now - lastShot < fireRate) return;
  lastShot = now;

  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

  if (mode === "normal") bullets.push({ x: player.x, y: player.y, angle, speed: 10, size: 4, color: "#ffe600" });
  if (mode === "scatter") [-0.2,0,0.2].forEach(a => bullets.push({ x: player.x, y: player.y, angle: angle+a, speed: 10, size: 4, color: "#ff00ff" }));
  if (mode === "railgun") bullets.push({ x: player.x, y: player.y, angle, speed: 20, size: 6, color: "#0ff" });
}

function spawnEnemy() {
  const heavy = Math.random() < 0.25;
  enemies.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: heavy ? 24 : 12,
    speed: heavy ? 1 : 2,
    hp: heavy ? 2 : 1,
    score: heavy ? 30 : 10,
    heavy
  });
}
setInterval(() => running && spawnEnemy(), 900);

// DRAW TRIANGLE (player & small enemy)
function drawTriangle(x,y,size,angle,color){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(size,0);
  ctx.lineTo(-size,-size/1.5);
  ctx.lineTo(-size,size/1.5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// DRAW HEXAGON (big enemy)
function drawHexagon(x,y,size,angle,color){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  for(let i=0;i<6;i++) ctx.lineTo(size*Math.cos(i*Math.PI/3),size*Math.sin(i*Math.PI/3));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
function drawHearts(){
  const heartWidth = 20;
  const heartHeight = 20;
  const spacing = 10;
  for(let i=0;i<3;i++){
    const x = canvas.width-(i+1)*(heartWidth+spacing);
    const y = 20;
    ctx.fillStyle = (health/2>i)?"red":(health/2>i-0.5)?"pink":"#555";
    ctx.beginPath();
    ctx.moveTo(x+heartWidth/2,y+heartHeight/5);
    ctx.bezierCurveTo(x+heartWidth/2,y,x,y,x,y+heartHeight/4);
    ctx.bezierCurveTo(x,y+heartHeight/2,x+heartWidth/2,y+3*heartHeight/4,x+heartWidth/2,y+heartHeight);
    ctx.bezierCurveTo(x+heartWidth/2,y+3*heartHeight/4,x+heartWidth,y+heartHeight/2,x+heartWidth,y+heartHeight/4);
    ctx.bezierCurveTo(x+heartWidth,y,x+heartWidth/2,y,x+heartWidth/2,y+heartHeight/5);
    ctx.fill();
  }
}

function loop(){
  if(!running) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const bgGradient = ctx.createRadialGradient(canvas.width/2,canvas.height/2,0,canvas.width/2,canvas.height/2,canvas.height);
  bgGradient.addColorStop(0,"#020b10");
  bgGradient.addColorStop(1,"#000");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const starColors = ["#0ff","#ff00ff","#00ffcc"];
  stars.forEach(s=>{
    s.y+=s.z;
    if(s.y>canvas.height) s.y=0;
    ctx.fillStyle=starColors[Math.floor(Math.random()*starColors.length)];
    ctx.fillRect(s.x,s.y,s.z,s.z);
  });

  const dx = mouse.x-player.x;
  const dy = mouse.y-player.y;
  const dist = Math.hypot(dx,dy);
  if(dist>1){
    player.x+=(dx/dist)*player.speed;
    player.y+=(dy/dist)*player.speed;
  }

  if(shooting) shoot();

  bullets.forEach((b,i)=>{
    b.x+=Math.cos(b.angle)*b.speed;
    b.y+=Math.sin(b.angle)*b.speed;

    ctx.beginPath();
    ctx.arc(b.x,b.y,b.size,0,Math.PI*2);
    ctx.fillStyle=b.color;
    ctx.shadowColor=b.color;
    ctx.shadowBlur=12;
    ctx.fill();

    enemies.forEach((e,ei)=>{
      if(Math.hypot(b.x-e.x,b.y-e.y)<e.size){
        bullets.splice(i,1);
        e.hp--;
        enemyHitSound();
        if(e.hp<=0){
          enemies.splice(ei,1);
          score+=e.score;
          kills++;
        }
      }
    });

    if(b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height) bullets.splice(i,1);
  });

  enemies.forEach((e,ei)=>{
    const ex = player.x-e.x;
    const ey = player.y-e.y;
    const d = Math.hypot(ex,ey);
    e.x += (ex/d)*e.speed;
    e.y += (ey/d)*e.speed;

    if(e.heavy) drawHexagon(e.x,e.y,e.size,Math.atan2(ey,ex),"#ffea00");
    else drawTriangle(e.x,e.y,e.size,Math.atan2(ey,ex),"red");

    if(d<e.size+player.size){
      enemies.splice(ei,1);
      health--;
      hitBeep();
      if(health<=0) endGame();
    }
  });

  drawTriangle(player.x,player.y,player.size,Math.atan2(dy,dx),"#0ff");

  drawHearts();
  scoreEl.textContent = score;
  killsEl.textContent = kills;

  requestAnimationFrame(loop);
}

function endGame(){
  running=false;
  canvas.style.display="none";
  hud.style.display="none";
  gameOverScreen.style.display="flex";
  finalScoreEl.textContent=score;
}

rebootBtn.onclick=()=>location.reload();
