const numberOfParticules = 20
  , minOrbitRadius = 50
  , maxOrbitRadius = 100
  , minCircleRadius = 10
  , maxCircleRadius = 20
  , minAnimeDuration = 900
  , maxAnimeDuration = 1500
  , minDiffuseRadius = 50
  , maxDiffuseRadius = 100;
let canvasEl = document.querySelector(".fireworks")
  , ctx = canvasEl.getContext("2d")
  , pointerX = 0
  , pointerY = 0
  , tap = "ontouchstart"in window || navigator.msMaxTouchPoints ? "touchstart" : "mousedown"
  , colors = ["102, 167, 221", "62, 131, 225", "33, 78, 194"];
function setCanvasSize() {
    canvasEl.width = window.innerWidth,
    canvasEl.height = window.innerHeight,
    canvasEl.style.width = window.innerWidth + "px",
    canvasEl.style.height = window.innerHeight + "px"
}
function updateCoords(e) {
    pointerX = e.clientX || e.touches[0].clientX,
    pointerY = e.clientY || e.touches[0].clientY
}
function setParticuleDirection(e) {
    let i = anime.random(0, 360) * Math.PI / 180
      , t = anime.random(minDiffuseRadius, maxDiffuseRadius)
      , a = [-1, 1][anime.random(0, 1)] * t;
    return {
        x: e.x + a * Math.cos(i),
        y: e.y + a * Math.sin(i)
    }
}
function createParticule(e, i) {
    let t = {};
    return t.x = e,
    t.y = i,
    t.color = "rgba(" + colors[anime.random(0, colors.length - 1)] + "," + anime.random(.2, .8) + ")",
    t.radius = anime.random(minCircleRadius, maxCircleRadius),
    t.endPos = setParticuleDirection(t),
    t.draw = function() {
        ctx.beginPath(),
        ctx.arc(t.x, t.y, t.radius, 0, 2 * Math.PI, !0),
        ctx.fillStyle = t.color,
        ctx.fill()
    }
    ,
    t
}
function createCircle(e, i) {
    let t = {};
    return t.x = e,
    t.y = i,
    t.color = "#000",
    t.radius = .1,
    t.alpha = .5,
    t.lineWidth = 6,
    t.draw = function() {
        ctx.globalAlpha = t.alpha,
        ctx.beginPath(),
        ctx.arc(t.x, t.y, t.radius, 0, 2 * Math.PI, !0),
        ctx.lineWidth = t.lineWidth,
        ctx.strokeStyle = t.color,
        ctx.stroke(),
        ctx.globalAlpha = 1
    }
    ,
    t
}
function renderParticule(e) {
    for (let i = 0; i < e.animatables.length; i++)
        e.animatables[i].target.draw()
}
function animateParticules(e, i) {
    let t = createCircle(e, i)
      , a = [];
    for (let t = 0; t < numberOfParticules; t++)
        a.push(createParticule(e, i));
    anime.timeline().add({
        targets: a,
        x: function(e) {
            return e.endPos.x
        },
        y: function(e) {
            return e.endPos.y
        },
        radius: .1,
        duration: anime.random(minAnimeDuration, maxAnimeDuration),
        easing: "easeOutExpo",
        update: renderParticule
    }).add({
        targets: t,
        radius: anime.random(minOrbitRadius, maxOrbitRadius),
        lineWidth: 0,
        alpha: {
            value: 0,
            easing: "linear",
            duration: anime.random(600, 800)
        },
        duration: anime.random(1200, 1800),
        easing: "easeOutExpo",
        update: renderParticule,
        offset: 0
    })
}
CONFIG.fireworks.colors && (colors = CONFIG.fireworks.colors);
let render = anime({
    duration: 1 / 0,
    update: function() {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
    }
});
document.addEventListener(tap, function(e) {
    render.play(),
    updateCoords(e),
    animateParticules(pointerX, pointerY)
}, !1),
setCanvasSize(),
window.addEventListener("resize", setCanvasSize, !1);
