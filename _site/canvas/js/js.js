/**
 * Created by Administrator on 2016/9/30.
 */
var canvasWidth=Math.min(500,document.body.clientWidth);
var canvasHeight=canvasWidth;
var isMouseState=false;
var lastLoc={x:0,y:0};
var lastTimeStamp=0;
var lastLineWidth=-1;
var lineColor='black';


var canvas=document.getElementById('canvas');
var context=canvas.getContext("2d");

canvas.width=canvasWidth;
canvas.height=canvasHeight;

var control=document.querySelector('.control');
control.style.width=canvasWidth+'px';
console.log(canvasWidth);


drawCell();
//清除代码
var clearBtn=document.getElementById('clear_btn');
clearBtn.onclick=function(){
  context.clearRect(0,0,canvasWidth,canvasHeight);
    drawCell();
};
//选择颜色
var selected=document.querySelectorAll('.color-btn');
for(var i=0;i<selected.length;i++){
    selected[i].index=i;
    selected[i].onclick=function(){
        for(var j=0;j<selected.length;j++){
            if(j==this.index){
                this.setAttribute('class','selected-color color-btn');
                lineColor=getStyle(this,'background-color');
            }else{
                selected[j].setAttribute('class','color-btn')
            }
        }
    };
}

function beginStroke(pointer){
    isMouseState=true;
    lastLoc=windowToCanvas(pointer.x ,pointer.y);
    lastTimeStamp=new Date().getTime();
}
function endStroke(e){
   isMouseState=false;
}
function moveStroke(pointer){
    var curLoc=windowToCanvas(pointer.x ,pointer.y);
    var curTimeStamp=new Date().getTime();
    var s=calcDistance(curLoc,lastLoc);
    var t=curTimeStamp-lastTimeStamp;

    var lineWidth=calcLineWidth(s,t);
    //绘画
    context.beginPath();
    context.moveTo(lastLoc.x,lastLoc.y);
    context.lineTo(curLoc.x,curLoc.y);
    context.strokeStyle=lineColor;
    context.lineWidth=lineWidth;
    context.lineCap='round';
    context.lineJoin='round';
    context.stroke();

    lastLoc=curLoc;
    lastTimeStamp=curTimeStamp;
    lastLineWidth=lineWidth;
}
canvas.onmousedown=function(e){
    e.preventDefault();
   beginStroke({x:e.clientX,y:e.clientY});
    // console.log(1)
};
canvas.onmouseup=function(e){
    e.preventDefault();
   endStroke();
    // console.log(2)
};
canvas.onmouseout=function(e){
    e.preventDefault();
    endStroke();
    // console.log(3)
};
canvas.onmousemove=function(e){
    e.preventDefault();
    if(isMouseState){
      moveStroke({x:e.clientX,y:e.clientY});
    }
};


//触摸事件
canvas.addEventListener('touchstart',function(e){
    e.preventDefault();
    var touch=e.touches[0];
    beginStroke({x:touch.pageX,y:touch.pageY});
});
canvas.addEventListener('touchmove',function(e){
    e.preventDefault();
    if(isMouseState){
       var touch=e.touches[0];
        moveStroke({x:touch.pageX,y:touch.pageY})
    }
});
canvas.addEventListener('touchend',function(e){
   e.preventDefault();
    endStroke();
});



//根据速度设置线条的宽度、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、
var maxLineWidth=10;
var minLineWidth=1;
var maxStrokeSpeed=10;
var minStrokeSpeed=0.1;
function calcLineWidth(s,t){
    var v=s/t;
    var resultLineWidth;
    if(v<=minStrokeSpeed){
        resultLineWidth=maxLineWidth;
    }
    else if(v>=maxStrokeSpeed){
        resultLineWidth=minLineWidth;
    }
    else{
        resultLineWidth=(maxStrokeSpeed-v)/(maxStrokeSpeed-minStrokeSpeed)*(maxLineWidth-minLineWidth)+minLineWidth;
    }
    if(lastLineWidth==-1){
        return resultLineWidth;
    }
    return lastLineWidth*2/3+resultLineWidth*1/3;
}
//、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、

