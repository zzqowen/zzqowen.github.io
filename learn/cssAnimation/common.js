var Tween = {
    Quad: {
        easeInOut: function(e, t, i, n) {
            if ((e /= n / 2) < 1)
                return i / 2 * e * e + t;
            return -i / 2 * (--e * (e - 2) - 1) + t
        }
    }
};
Math.animation = function(e, t, i, n, a) {
    var r = function(e) {
        return typeof e == "undefined"
    };
    var o = function(e) {
        return typeof e == "function"
    };
    var l = function(e) {
        return typeof e == "number"
    };
    var s = function(e) {
        return typeof e == "string"
    };
    var c = function(e) {
        if (l(e)) {
            return e
        } else if (s(e)) {
            if (/\d+m?s$/.test(e)) {
                if (/ms/.test(e)) {
                    return 1 * e.replace("ms", "")
                }
                return 1e3 * e.replace("s", "")
            } else if (/^\d+$/.test(e)) {
                return +e
            }
        }
        return -1
    };
    if (!l(e) || !l(t)) {
        if (window.console) {
            console.error("from和to两个参数必须且为数值")
        }
        return 0
    }
    var u = Math.tween || window.Tween;
    if (!u) {
        if (window.console) {
            console.error("缓动算法函数缺失")
        }
        return 0
    }
    var d = {
        duration: 300,
        easing: "Linear",
        callback: function() {}
    };
    var f = function(e) {
        if (o(e)) {
            d.callback = e
        } else if (c(e) != -1) {
            d.duration = c(e)
        } else if (s(e)) {
            d.easing = e
        }
    };
    f(i);
    f(n);
    f(a);
    if (!window.requestAnimationFrame) {
        requestAnimationFrame = function(e) {
            setTimeout(e, 17)
        }
    }
    var h = 0;
    var v = Math.ceil(d.duration / 17);
    d.easing = d.easing.slice(0, 1).toUpperCase() + d.easing.slice(1);
    var m = d.easing.split(".");
    console.log(m, d)
    var g;
    if (m.length == 1) {
        g = u[m[0]]
    } else if (m.length == 2) {
        g = u[m[0]] && u[m[0]][m[1]]
    }
    if (o(g) == false) {
        console.error('没有找到名为"' + d.easing + '"的动画算法');
        return
    }
    var p = function() {
        var i = g(h, e, t - e, v);
        h++;
        if (h <= v) {
            d.callback(i);
            requestAnimationFrame(p)
        } else {
            d.callback(t, true)
        }
    };
    p()
}
;
(function() {
    if (!window.addEventListener) {
        document.body.insertAdjacentHTML("afterbegin", '<div class="no-support">当前浏览器版本过低，本页面未对其进行支持</div>');
        return
    }
    var e = navigator.userAgent;
    if (/window/i.test(e) && /chrome/i.test(e)) {
        document.querySelector(".main").classList.add("modren")
    }
    var t = document.querySelector("#starCanvas");
    var i = t.getContext("2d");
    var n = {}
      , a = 0
      , r = {
        r: 1400,
        height: 260,
        density: 300,
        maxLife: 100,
        groundLevel: t.height,
        leftWall: 0,
        rightWall: t.width,
        alpha: 0,
        maxAlpha: 1
    };
    var o = function() {
        var e = Math.random();
        var t = Math.ceil(1 / (1 - e));
        var i = [];
        for (var n = 0; n < t; n++) {
            i.push(Math.random())
        }
        return Math.min.apply(null, i)
    };
    function l() {
        t.width = window.innerWidth;
        t.height = window.innerHeight;
        r.rightWall = t.width;
        r.groundLevel = t.height;
        for (var e in n) {
            n[e].y = o() * t.height
        }
        s();
        if (t.width <= 480) {
            document.body.className = "mobile"
        } else {
            document.body.className = "pc"
        }
    }
    l();
    window.addEventListener("resize", l);
    function s() {
        i.clearRect(0, 0, t.width, t.height)
    }
    function c() {
        var e = t.width / 2
          , i = t.height;
        this.x = Math.floor(Math.random() * t.width);
        this.y = o() * t.height;
        this.vx = Math.random() * .1 + .05;
        this.particleSize = .5 + (Math.random() + .1 / 4);
        a++;
        n[a] = this;
        this.alpha = 0;
        this.maxAlpha = .2 + this.y / t.height * Math.random() * .8;
        this.alphaAction = 1
    }
    c.prototype.draw = function() {
        this.x += this.vx;
        if (this.alphaAction == 1) {
            if (this.alpha < this.maxAlpha) {
                this.alpha += .005
            } else {
                this.alphaAction = -1
            }
        } else {
            if (this.alpha > .2) {
                this.alpha -= .002
            } else {
                this.alphaAction = 1
            }
        }
        if (this.x + this.particleSize * 2 >= r.rightWall) {
            this.x = this.x - r.rightWall
        }
        i.beginPath();
        i.fillStyle = "rgba(255,255,255," + this.alpha.toString() + ")";
        i.arc(this.x, this.y, this.particleSize, 0, Math.PI * 2, true);
        i.closePath();
        i.fill()
    }
    ;
    function u() {
        s();
        var e = 400;
        if (!history.pushState) {
            e = 200
        } else if (document.msHidden != undefined) {
            e = 300
        }
        if (screen.width < 1024) {
            e = 200
        }
        if (screen.width < 640) {
            e = 100
        }
        if (Object.keys(n).length > e) {
            r.density = 0
        }
        for (var t = 0; t < r.density; t++) {
            if (Math.random() > .97) {
                new c
            }
        }
        for (var t in n) {
            n[t].draw()
        }
        requestAnimationFrame(u)
    }
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(e) {
            setTimeout(e, 17)
        }
    }
    u();
    var d = document.querySelector("#feMap");
    var f = document.querySelector("#svgFeImage");
    var h = document.createElement("canvas");
    var v = h.getContext("2d");
    var m = 600
      , g = 300
      , p = 300;
    h.width = m;
    h.height = g;
    var w = 188;
    v.fillStyle = "rgb(" + [w, w, w].join() + ")";
    v.fillRect(0, 0, m, g);
    var y = v.createLinearGradient(m - p, 0, m, 0);
    y.addColorStop(0, "rgb(" + [w, w, w].join() + ")");
    y.addColorStop(1, "rgb(" + [255, w, 0].join() + ")");
    v.fillStyle = y;
    v.fillRect(m - p, 0, p, g);
    f.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", h.toDataURL());
    var b = function() {
        Math.animation(0, 60, 5e3, "Quad.easeInOut", function(e, t) {
            d.setAttribute("scale", e);
            if (t == true) {
                Math.animation(60, 0, 5e3, "Quad.easeInOut", function(e, t) {
                    d.setAttribute("scale", e);
                    if (t == true) {
                        b()
                    }
                })
            }
        })
    };
    // b();
    var S = document.getElementById("iconBuy");
    var A = document.getElementById("iconPageDown");
    var M = document.querySelectorAll("#sceneCtrl a");
    var x = document.querySelectorAll(".page");
    var q = x.length;
    var L = function() {
        var e = document.querySelector(".page.active");
        if (!e) {
            return
        }
        var t = e.id.replace(/\D/g, "") * 1;
        if (t == 1) {
            S.style.visibility = ""
        } else {
            S.style.visibility = "visible"
        }
        var i = document.querySelector("#sceneCtrl .cur");
        if (i) {
            i.className = i.className.replace(" cur", "")
        }
        i = M[t - 1];
        if (i) {
            i.className = i.className + " cur"
        }
        if (t == q) {
            A.style.visibility = "hidden"
        } else {
            A.style.visibility = "";
            A.setAttribute("data-index", t + 1)
        }
    };
    var E = false;
    var D = function(e) {
        if (typeof e == "undefined") {
            return
        }
        var t = document.getElementById("page" + e);
        var i = document.querySelector(".page.active");
        if (t != i) {
            i.className = i.className.replace(" active", "");
            t.className += " active";
            L();
            A.style.opacity = "0";
            E = true;
            setTimeout(function() {
                A.style.opacity = "";
                E = false
            }, 300)
        }
    };
    [].slice.call(M).forEach(function(e) {
        e.addEventListener("click", function() {
            var e = this.getAttribute("data-index");
            D(e)
        })
    });
    A.addEventListener("click", function() {
        var e = this.getAttribute("data-index");
        D(e)
    });
    var N = function(e, t) {
      console.log(e, t)
        var i = function(e) {
            var i = e.type;
            if (i == "DOMMouseScroll" || i == "mousewheel") {
                e.delta = e.wheelDelta ? e.wheelDelta / 120 : -(e.detail || 0) / 3
            }
            if (e.srcElement && !e.target) {
                e.target = e.srcElement
            }
            if (!e.preventDefault && e.returnValue !== t) {
                e.preventDefault = function() {
                    e.returnValue = false
                }
            }
            return e
        };
        if (e.addEventListener) {
            return function(e, n, a, r) {
                if (n === "mousewheel" && document.mozFullScreen !== t) {
                    n = "DOMMouseScroll"
                }
                e.addEventListener(n, function(e) {
                    a.call(this, i(e))
                }, r || false)
            }
        }
        return function() {}
    }(window);
    N(document, "mousewheel", function(e) {
        console.log(e)
        if (E) {
            return
        }
        var t = document.querySelector(".page.active");
        if (!t) {
            return
        }
        var i = t.id.replace(/\D/g, "") * 1;
        if (e.delta < 0) {
            if (i < q) {
                i++
            }
        } else if (i > 1) {
            i--
        }
        D(i)
    });
    var k = {};
    if ("ontouchstart"in document.body) {
        document.body.addEventListener("touchstart", function(e) {
            var t = e.touches[0] || e;
            k.posY = t.pageY;
            k.touching = true
        });
        document.addEventListener("touchmove", function(e) {
            if (k.touching !== true) {
                return
            }
            var t = e.touches[0] || e;
            k.nowY = t.pageY
        });
        document.addEventListener("touchend", function() {
            if (k.touching === false) {
                return
            }
            k.touching = false;
            var e = k.nowY - k.posY;
            var t = document.querySelector(".page.active");
            if (!t) {
                return
            }
            var i = t.id.replace(/\D/g, "") * 1;
            if (e > 20) {
                if (i > 1) {
                    i--
                }
            } else if (e < -20 && i < q) {
                i++
            } else {
                return
            }
            D(i)
        })
    }
}
)();