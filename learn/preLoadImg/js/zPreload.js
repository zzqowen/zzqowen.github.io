;(function (_global, factory) {
    if (typeof module !== "undefined" && module.exports) {
        //Node, CommonJS之类的
        module.exports = factory();
    } else if (typeof define === "function" && define.amd) {
        //AMD
        define(factory)
    } else {
        //浏览器全局变量(root 即 window)
        !('zPreload' in _global) && (_global.zPreload = factory());
    }
}(this, function () {
    var isExist = function (f) {
        return f && typeof f === 'function';
    };

    function zPreload(config) {
        this._init(config);
    };

    zPreload.prototype = {
        _init: function (config) {
            this.options = {
                type: 'image', //资源类型，默认是图片
                resources: [], //资源路径数组
                baseUrl: './', //基准url
                onStart: null, //开始预加载回调函数
                onProgress: null, //正在加载回调函数
                onComplete: null //已经加载完成回调函数
            };

            if (config) {
                for (var i in config) {
                    this.options[i] = config[i];
                }
            } else {
                console.log('参数错误');
                return;
            }
            ;

            this.total = this.options.resources.length || 0; //资源总数
            this.currentIndex = 0; //当前正在加载的资源索引
            this.preloadImg = [];//已经加载完成的图片数组
        },
        //开始预加载
        start: function () {
            var _this = this;
            var resources = _this.options.resources;
            var baseUrl = this.options.baseUrl;
            if (isExist(this.options.onStart)) {
                this.options.onStart(this.total);
            }
            for (var i = 0, l = resources.length; i < l; i++) {
                var url;
                if (resources[i].indexOf('http://') === 0 || resources[i].indexOf('https://') === 0) {
                    url = resources[i];
                }
                else {
                    url = baseUrl + resources[i];
                }

                var image = new Image();
                image.onload = function () {
                	                	var img = this;
                		document.body.appendChild(img.cloneNode(true));
                    load(img.cloneNode(true))
                };
                image.onerror = function () {
                    load()
                };
                image.src = url;
            }

            var load = function (image) {
                if (image) _this.preloadImg.push(image);
                ++_this.currentIndex;
                if (isExist(_this.options.onProgress)) {
                    _this.options.onProgress(_this.currentIndex, _this.total);
                }
                //加载完毕
                if (_this.currentIndex === _this.total) {
                    _this.getAllImg();
                    if (isExist(_this.options.onComplete)) {
                        _this.options.onComplete(_this.total);
                    }
                }
            }
        },

        getAllImg: function () {
            var preloadImg = this.preloadImg;
            var imgArr = document.getElementsByTagName('img');
//          preloadImg[0].id = 'ddd';
//          document.body.appendChild(preloadImg[0]);
//          setTimeout(function(){
//          	            var ddd = document.getElementById('ddd').cloneNode();
//                      console.log(ddd);
//
//          }, 5000)
            console.log(preloadImg);
            console.log(imgArr);
//                      var pImg = preloadImg[0].cloneNode(true);
//                      var dd = pImg.cloneNode(true);
                        
                        console.log(pImg);

            for (var j = 0; j < imgArr.length; j++) {
                for (var n = 0; n < preloadImg.length; n++) {
                	console.log(8888)
                    if (imgArr[j].getAttribute('data-zsrc') == preloadImg[n].src) {
                    	console.log(99999999)
                        var attrs = imgArr[j].attributes;
                        var attrsArray = Array.prototype.slice.call(attrs);      //转换为数组形式
                        var pImg = preloadImg[n];

                        for (var m in attrsArray) {
                            if (attrsArray[m].nodeName == 'src' || attrsArray[m].nodeName == 'data-zsrc') {
                                continue;
                            }
                            pImg.setAttribute(attrsArray[m].nodeName, attrsArray[m].value)
                        }
                           console.log(pImg);
                        imgArr[j].parentNode.replaceChild(pImg, imgArr[j]);
                    }
                }
            }
        }
    };
    return zPreload;
}));