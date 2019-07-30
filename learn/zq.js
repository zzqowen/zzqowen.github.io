;(function(undefined) {
    "use strict";
    var _global;
    var popupNum = 0;//popup的个数
    var domObj;

    //获取DOM元素
    var $zq = function(obj){
        if (obj instanceof Object) {
            domObj = obj;
        } else {
            domObj = document.querySelector(obj);
        }
        if (domObj) {
            domObj.css = function(attr, val){
                if (val) {
                    domObj.style[attr] = val;
                } else {
                    if (attr instanceof Object){
                        for (var i in attr) {
                            domObj.style[i] = attr[i];
                        }
                    } else {
                        return (function() {
                            if(domObj.currentStyle) {
                                return domObj.currentStyle[attr];
                            } else {
                                return getComputedStyle(domObj,false)[attr];
                            }
                        }());
                    }
                }
            };
        }
        return domObj;
    };

    //自定义弹窗
    $zq.popup = function(params){
        var params = params || {};
        var parameter = {
            title: params.title || '这是个弹框',
            buttons: params.buttons || [{id: 'confirm', text: '确定', onTap: function(){}}],
            url: params.url || "",
            htmlUrl: params.htmlUrl || "",
            bg: params.bg != false ? true : false,
            readyStart: params.readyStart || function(){}
        };

        var container = document.createElement('div');
        container.className = 'zq_popup_pontainer' + popupNum;
        $zq(container).css({'display': 'flex', 'flexFlow': 'row nowrap', 'alignItems': 'center', 'justifyContent': 'center','width': '100%', 'height': '100%', 'position': 'fixed', 'top': "0", 'left': '0', 'zIndex': '9999', 'opacity': '0', 'transition': 'all 300ms linear'});
        var popupBg = document.createElement('div');
        $zq(popupBg).css({'position': 'absolute', 'top': '0', 'left': '0', 'backgroundColor': 'rgba(0,0,0,0.5)', 'width': '100%', 'height': '100%'});
        var popupContent = document.createElement('div');
        $zq(popupContent).css({'position': 'relative', 'zIndex': '11111'});
        container.appendChild(popupBg);
        container.appendChild(popupContent);
        if (parameter.htmlUrl != ""){
            popupContent.innerHTML = parameter.htmlUrl;
            setTimeout(function(){
                $zq(container).css({'opacity': '1'});
            });
            buttonClick();
        } else if (parameter.url != "") {
            getHtmlElement(parameter.url, popupNum, function(html){
                popupContent.innerHTML = html;
                parameter.readyStart();
                setTimeout(function(){
                    $zq(container).css({'opacity': '1'});
                });
                buttonClick();
            });
        } else {
            var contentBox = document.createElement('div');
            $zq(contentBox).css({'width': '300px','padding': '20px', 'borderRadius': '8px','backgroundColor': 'white'});
            popupContent.appendChild(contentBox);

            var popupTitle = document.createElement('div');
            popupTitle.innerHTML = parameter.title;
            $zq(popupTitle).css({'textAlign': 'center', 'height': '48px'});
            contentBox.appendChild(popupTitle);

            var popupButtonParent = document.createElement('div');
            $zq(popupButtonParent).css({'textAlign': 'center'});
            contentBox.appendChild(popupButtonParent);

            var popupConfirm = document.createElement('div');
            popupConfirm.id = parameter.buttons[0].id;
            popupConfirm.innerHTML = parameter.buttons[0].text;
            $zq(popupConfirm).css({'display': 'inline-block', 'border': '1px solid #ccc', 'borderRadius': '5px', 'padding': '5px 8px', 'margin': '0 10px'});
            popupButtonParent.appendChild(popupConfirm);
            setTimeout(function(){
                $zq(container).css({'opacity': '1'});
            });
            buttonClick();
        }

        document.body.appendChild(container);
        popupNum ++;

        function buttonClick(){
            setTimeout(function(){
                var buttons = parameter.buttons;
                for (var m = 0; m < buttons.length; m++) {
                    (function(m){
                        if (document.getElementById(buttons[m].id)) {
                            var className = buttons[m].className ? buttons[m].className : " ";
                            pcOrPhoneClick(document.getElementById(buttons[m].id),function(){
                                if (buttons[m].ableClose != false) closePopup();
                                if (buttons[m].onTap) buttons[m].onTap();
                            })
                        }
                    })(m)
                }
            });
        }

        //点击背景是否关闭弹窗
        if (parameter.bg != false) {
            pcOrPhoneClick($zq(popupBg),function(){
                closePopup();
            })
        }

        function pcOrPhoneClick(obj,callBack){
            if ($zq.IsPC()){
                obj.onclick = function(){
                    callBack()
                }
            } else {
                myClick(obj, function(){
                    callBack();
                });
            }
        }

        function closePopup(){
            if ($zq('.zq_popup_pontainer' + (popupNum - 1))) $zq('.zq_popup_pontainer' + (popupNum - 1)).css({'opacity': '0'});
            setTimeout(function(){
                if ($zq('.zq_popup_pontainer' + (popupNum - 1))) document.body.removeChild($zq('.zq_popup_pontainer' + (popupNum - 1)));
                popupNum --;
            });
        }

        function myClick(obj, callback){
            var firstP = {
                x: 0,
                y: 0
            };
            var ableClick = true;
            obj.addEventListener('touchstart', function(e){
                var ev = e || window.event;
                ev.preventDefault();
                firstP.x = ev.touches[0].pageX;
                firstP.y = ev.touches[0].pageY;
                obj.addEventListener('touchmove', function(e){
                    var ev = e || window.event;
                    var secondP = {
                        x: ev.touches[0].pageX,
                        y: ev.touches[0].pageY
                    };
                    if (ableClick && Math.abs(secondP.y - firstP.y) >= 10 && Math.abs(secondP.x - firstP.x) >= 10) {
                        ableClick = false;
                    }
                },false);

            }, false);

            obj.addEventListener('touchend', function(e){
                var ev = e || window.event;
                console.log(ableClick);
                if (ableClick) {
                    callback();
                }
                ableClick = true;
            },false);

            obj.addEventListener('touchcancel', function(e){
                var ev = e || window.event;
                if (ableClick) {
                    callback();
                }
                ableClick = true;
            },false);
        }

        function getHtmlElement(src, index, callback){
            var iframe = document.createElement("iframe");
            iframe.src = src;
            iframe.style.display = 'none';
            iframe.className = 'zIfmId' + index;
            if (iframe.attachEvent){
                iframe.attachEvent("onload", function(){
                    callback(iframe.contentWindow.document.body.innerHTML);
                    document.body.removeChild(document.querySelector('.zIfmId' + index));
                });
            } else {
                iframe.onload = function(){
                    callback(iframe.contentWindow.document.body.innerHTML);
                    document.body.removeChild(document.querySelector('.zIfmId' + index));
                };
            }
            document.body.appendChild(iframe);
        }

        this.pClose = function(){
            closePopup();
        };
    };

    //判断是手机还是PC
    $zq.IsPC = function() {
        var userAgentInfo = navigator.userAgent;
        var Agents = ["Android", "iPhone",
            "SymbianOS", "Windows Phone",
            "iPad", "iPod"];
        var flag = true;
        for (var v = 0; v < Agents.length; v++) {
            if (userAgentInfo.indexOf(Agents[v]) > 0) {
                flag = false;
                break;
            }
        }
        return flag;
    };

    // 最后将插件对象暴露给全局对象
    _global = (function(){ return this || (0, eval)('this'); }());
    if (typeof module !== "undefined" && module.exports) {
        module.exports = $zq;
    } else if (typeof define === "function" && define.amd) {
        define(function(){return $zq;});
    } else {
        !('$zq' in _global) && (_global.$zq = $zq);
    }
}());

