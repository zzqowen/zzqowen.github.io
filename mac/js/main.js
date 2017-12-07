var tab = {
    addClass: function(obj, css){
        obj.className = obj.className + " " + css;
    },
    removeClass: function(obj, css){
        if (obj.className.indexOf(css) != -1){
            var arr = obj.className.split(" " + css);
            var str = "";
            for (var i = 0; i< arr.length; i++){
                str += arr[i];
            }
            obj.className = str;
        }
    }
};

var current = 0; //默认打开的选项

var allContent = $All(".content");
var allTitle = $All(".title");

for (var i = 0; i< allContent.length; i++){
    if (i == current){
        console.log(allContent[i]);
        tab.addClass(allContent[i], "cur");
        console.log(allContent[i].className)
    }

    (function (i){
        allTitle[i].onclick = function(){
            for (var j = 0; j< allTitle.length; j++){
                if (j == i){
                    if (getStyle(allContent[j], "display") == "block"){
                        tab.removeClass(allContent[j], "cur");
                    } else {
                        tab.addClass(allContent[j], "cur");
                    }
                } else {
                    tab.removeClass(allContent[j], "cur");
                }
            }
        }
    })(i)
}