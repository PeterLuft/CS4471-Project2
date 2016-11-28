/**
 * Created by pwluft on 2016-11-27.
 */



window.onload = function init() {

    console.log("loaded");

    canvas = document.getElementById("gl-canvas");


    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }


}