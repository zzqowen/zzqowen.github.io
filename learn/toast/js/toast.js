;(function(undefined) {
    "use strict";

function cssStyle(ele, cssObj) {
    if (ele instanceof Array) {
      for (var j in ele) {
        for (var i in cssObj) {
          ele[j].style[i] = cssObj[i];
        }
      }
    } else {
      for (var i in cssObj) {
        ele.style[i] = cssObj[i];
      }
    }
  }
    //获取DOM元素
    var $toast = function(obj){
        var obj = obj ? obj : {};
        var options = {
          title: '提示',
          duration: 2000,
          color: 'rgba(0,0,0,0.5)',
          ableBg: false
        };

        for (var i in options) {
          if (obj[i]) {
            options[i] = obj[i];
          }
        }

        var toast = document.createElement('div');
        cssStyle(toast, {'position': 'fixed', 'width': '100%', 'height': '100%', 'top': '0', 'left': '0', 'backgroundColor': options.ableBg ? options.color : 'transparent'});
        var content = document.createElement('div');
        cssStyle(content, {'overflow': 'hidden','position': 'fixed', 'fontSize': '14px', 'minWidth' : '80px', 'maxWidth': '300px', 'height': '42px', 'whiteSpace': 'nowrap', 'padding': '0 10px', 'borderRadius': '21px', 'backgroundColor': '#656565', 'color': 'white', 'top': '50%', 'textAlign': 'center', 'lineHeight': '42px', 'left': '50%', 'transform': 'translate(-50%, -50%)','WebkitTransform': 'translate(-50%, -50%)','MozTransform': 'translate(-50%, -50%)','MsTransform': 'translate(-50%, -50%)'});
        toast.appendChild(content);
        content.innerHTML = options.title
        document.body.style.overflow = 'hidden';
        document.body.appendChild(content);

        setTimeout(function() {
          document.body.removeAttribute('style');
          document.body.removeChild(content);
        }, options.duration);
    };


    // 最后将插件对象暴露给全局对象
    var _global = (function(){ return this || (0, eval)('this'); }());
    if (typeof module !== "undefined" && module.exports) {
        module.exports = $toast;
    } else if (typeof define === "function" && define.amd) {
        define(function(){return $toast;});
    } else {
        !('$toast' in _global) && (_global.$toast = $toast);
    }
}());