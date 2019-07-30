/**
 * Created by huawenkeji on 2018/2/5.
 */
    //压缩图片
var pictures = {
    //图片压缩成base64
    compress: function(source_img_obj, quality, output_format, back){
        var mime_type;
        if(output_format==="png"){
            mime_type = "image/png";
        } else if(output_format==="webp") {
            mime_type = "image/webp";
        } else {
            mime_type = "image/jpeg";
        }

        var img = new Image();
        img.src = source_img_obj;
        img.setAttribute("crossOrigin",'Anonymous');//跨域图片
        if (img.complete){
            callback(img);
            return;
        }
        img.onload = function(){
            callback(img);
        };

        function callback(imgData){
            var cvs = document.createElement('canvas');
            cvs.width = imgData.width;
            cvs.height = imgData.height;
            var ctx = cvs.getContext("2d").drawImage(imgData, 0, 0);
            var newImageData = cvs.toDataURL(mime_type, quality/100);
            back(newImageData);
        }
    },
    //保存图片到本地
    save: function(img_url){
        var aLink = document.createElement("a");
        aLink.href = img_url;
        aLink.id = "dlLink";
        aLink.download = "max";
        document.body.appendChild(aLink);
        console.log(aLink);
        setTimeout(function(){
            document.getElementById("dlLink").click();

        }, 2000);
    },
    //dataUrl转Blob
    dataUrlToBlob: function(dataurl){
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    },
    //Blob转dataUrl
    BlobToDataUrl: function(blob, callback){
        var a = new FileReader();
        a.onload = function (e) { callback(e.target.result); };
        a.readAsDataURL(blob);
    },
    //上传Blob文件
    uploadBlobFile: function(blob){
        var fd = new FormData();
        fd.append("image", blob);
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/upload", true);
        xhr.send(fd);
        xhr.onreadystatechange = function(){
            if(xhr.readyState==4){
                if(xhr.status==200){
                    console.log(xhr.responseText);
                }
            }
        };
    }
};
