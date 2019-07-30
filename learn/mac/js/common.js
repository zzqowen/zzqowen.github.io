var $ = function(id){
    return document.querySelector(id);
};
var $All = function(id){
    return document.querySelectorAll(id);
};
var getStyle = function(obj, attr){
    if (obj.currentStyle){
        return obj.currentStyle[attr];
    } else {
        return getComputedStyle(obj, null)[attr];
    }
};