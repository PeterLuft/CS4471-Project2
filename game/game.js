var canvas;
var gl;

//alert(print_r(your array));  //call it like this


// Game wide constants
var canvas;
var gl;
var radius = 0.5; //Defines circle width and bacteria distance from origin
var cx = 0; // center sphere at origin
var cy = 0; // center sphere at origin
var cz = 0; // center sphere at origin
var num_points = 35; // Number of points to make up the circle

var score = 0; // Increase when a bacteria spends a tick at max length
var hi_score = 0;

var time = 5.000;





// Lighting and 3D related variables
var numTimesToSubdivide = 3;

var index = 0;

var pointsArray = [];
var normalsArray = [];


var near = -10;
var far = 10;
var radius = 1.5;
var theta  = 0.0;
var phi    = 0.0;
var dr = 5.0 * Math.PI/180.0;

var left = -3.0;
var right = 3.0;
var ytop =3.0;
var bottom = -3.0;

var va = vec4(0.0, 0.0, -1.0,1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333,1);

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialShininess = 10.0;

var ctm;
var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);


// FUNCTIONS FOR DRAWING THE SPHERE
function triangle(a, b, c){

    var t1 = subtract(b, a);
    var t2 = subtract(c, a);
    var normal = normalize(cross(t1, t2));
    normal = vec4(normal);
//above calculation puts a 1 in location[3], reset to 0
// for vector (MB June30)
    normal[3]=0;
    normalsArray.push(normal);
    normalsArray.push(normal);
    normalsArray.push(normal);

    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);

    index += 3;
}


function divideTriangle(a, b, c, count) {
    if ( count > 0 ) {

        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        divideTriangle( a, ab, ac, count - 1 );
        divideTriangle( ab, b, bc, count - 1 );
        divideTriangle( bc, c, ac, count - 1 );
        divideTriangle( ab, bc, ac, count - 1 );
    }
    else {
        triangle( a, b, c );
    }
}


//NOTE: Counter clockwise change (MB June 30)
function tetrahedron(a, b, c, d, n) {
    divideTriangle(c,b,a, n);
    divideTriangle(b,c,d, n);
    divideTriangle(b,d,a, n);
    divideTriangle(d,c,a, n);
}




window.onkeydown = function(e){

    var key = e.keyCode ? e.keyCode : e.which;


    if(key ==65 || key == 37){
        //left
        theta += dr;
    }
    else if(key == 39 || key == 68){
        //right
        theta -= dr;
    }



}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );


    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);


    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);


    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

    gl.uniform4fv( gl.getUniformLocation(program, "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, "shininess"),materialShininess );

    render();
}

// Render shapes to the screen
function render(){

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(radius*Math.sin(theta)*Math.cos(phi),
        radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));

    modelViewMatrix = lookAt(eye, at , up);
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );

    for( var i=0; i<index; i+=3)
        gl.drawArrays( gl.TRIANGLES, i, 3 );

    window.requestAnimFrame(render);
}

// Function for the bacteria to draw over the sphere
function bacteria(points){
    var b = {};
    if (points == null) {
        b.points = Bacteria(width, start, height);
    }else{
        b.points = points;
    }
    b.color = Math.floor( Math.random() * 4); console.log(b.color);
    b.start = start;
    b.alive = true; // Flip this flag to mark for overwrite when inserting new bacteria so we can reuse buffer space
    // TODO keep and rework into 3 dimensions
    b.grow = function() { // Add another 'unit' to the bacteria
        var center = points[0]; // First point of bacteria represents center point
        // Once bacteria reaches its max size, stop growing it and subtract points from the player on growth
        // Distance between the center and one of the outer points is used to determine the size
        if ( Math.sqrt(
                Math.pow(points[1].x - center.x),2) +
            Math.pow((points[1].x - center.x),2) +
            Math.pow((points[1].z - center.z),2)
        ) {
            update_score(-1);
        }else{
            for(var i = 0; i < points.length; i++) {
                // Move each point along the vector between the center and the point itself
                points[i].x += (points[i].x - center.x) * 1.10;
                points[i].y += (points[i].y - center.y) * 1.10;
                points[i].z += (points[i].z = center.z) * 1.10;
            }
        }
        // TODO update the points inside the buffer to reflect the new bacteria points in the program
    };
    b.die = function() {
        b.alive = false;
        active_bacteria--;
    };
    active_bacteria++;
    return b;
}

// Top Level Game Control Functions moved over from Project 1

function startPressed(){

}

function quitPressed(){

}




