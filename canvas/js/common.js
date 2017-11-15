/**
 * Created by Administrator on 2016/10/5.
 */
function drawCell(){
    context.beginPath();
    context.moveTo(3,3);
    context.lineTo(canvasWidth-3,3);
    context.lineTo(canvasWidth-3,canvasHeight-3);
    context.lineTo(3,canvasHeight-3);
    context.closePath();
    context.strokeStyle='red';
    context.lineWidth='5';
    context.stroke();

    context.beginPath();
    context.moveTo(3,3);
    context.lineTo(canvasWidth-3,canvasHeight-3);

    context.moveTo(canvasWidth-3,3);
    context.lineTo(3,canvasHeight-3);

    context.moveTo(canvasWidth/2,0);
    context.lineTo(canvasWidth/2,canvasHeight);

    context.moveTo(0,canvasHeight/2);
    context.lineTo(canvasWidth,canvasHeight/2);

    context.closePath();
    context.lineWidth='1';
    context.strokeStyle='#999';
    context.stroke();
}

function windowToCanvas(x,y){
    var bbox=canvas.getBoundingClientRect();
    return {x:Math.round(x-bbox.left),y:Math.round(y-bbox.top)}
}

function calcDistance(loc1,loc2){
    return Math.sqrt((loc1.x-loc2.x)*(loc1.x-loc2.x)+(loc1.y-loc2.y)*(loc1.y-loc2.y))
}
function getStyle(obj,attr){
    if(obj.currentStyle){
        return obj.currentStyle[attr];
    }else{
        return getComputedStyle(obj,null)[attr];
    }
}