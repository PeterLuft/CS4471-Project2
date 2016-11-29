//alert(print_r(your array));  //call it like this

// Game wide constants
var canvas;
var gl;
var radius = 0.5; //Defines circle width and bacteria distance from origin
var cx = 0; // center sphere at origin
var cy = 0; // center sphere at origin
var cz = 0; // center sphere at origin
var num_points = 35; // Number of points to make up the circle

var bacteria_list = [];

var num_bacteria_points = 0;
var azimuth = 0;
var altitude = 0;

var gamma = Math.PI*1.6; // Up to 2 PI radians
var epsilon = Math.PI*0.7; // Up to PI radians

var score = 0; // Increase when a bacteria spends a tick at max length
var hi_score = 0;

var time = 5.000;
var game_over = false;
// Second boolean variable for control flow of menu and game
var playing = false;



// References to HTML views
var gameoverView;
var winView;
var gameControl;
var menuControl;
var gameView;


// Lighting and 3D related variables
var numTimesToSubdivide = 6;

var index = 0;

var pointsArray = [];
var normalsArray = [];

var radian = 0.3;

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

    if(key == 38 && altitude < 7){
        //up
        console.log("Altitude keydown");
        altitude += 1;
        spawn_bacteria();
    }
    else if(key == 40 && altitude > 0){
        //down
        console.log("Altitude keydown");
        altitude -= 1;
        spawn_bacteria();
    }
    if(key ==65 || key == 37){
        //left
        theta += dr;
    }
    else if(key == 39 || key == 68){
        //right
        theta -= dr;
    }

};

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    canvas.addEventListener('click', canvasClicked);

    // Setting up HTML references
    //menuControl = document.getElementsByClassName("menu-control")[0];
    //gameControl = document.getElementById("game-control");
    //gameoverView = document.getElementById("gameover-view");
    //winView = document.getElementById("win-view");
    //gameView = document.getElementById("game-view");
    //
    //gameControl.style.display = 'none';
    //gameView.style.display = 'none';
    //gameoverView.style.display = 'none';
    //winView.style.display = 'none';


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
    gl.bufferData( gl.ARRAY_BUFFER, 64*1024*1024, gl.STATIC_DRAW );
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(normalsArray));

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, 64*1024*1024, gl.DYNAMIC_DRAW );
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(pointsArray));

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

    make_bacteria(0, 100, 3);
    make_bacteria(5, 100, 6);
    make_bacteria(0, 30, 1);

    render();
};

// Render shapes to the screen
function render(){

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(radius*Math.sin(theta)*Math.cos(phi),
        radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));

    modelViewMatrix = lookAt(eye, at , up);
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );

    // Render the sphere to the canvas
    for( var i=0; i<index; i+=3)
        gl.drawArrays( gl.TRIANGLES, i, 3 );

    gl.drawArrays(gl.TRIANGLE_STRIP, index, num_bacteria_points);

    window.requestAnimFrame(render);
}

function spawn_bacteria() {
    console.log("spawn_bacteria");
    if(game_over != true) {

        // ADD NEW BACTERIA TO THE SURFACE if the probability allow it
        //if (Math.floor((Math.random() * 100) < spawn_chance)) {
        // 1 - Create a new bacteria in JS
        var bact = bacteria();
        // 2 - Add the bacteria to an existing slot or add at the end of the buffer
        gl.bufferSubData(gl.ARRAY_BUFFER, index*8*2, flatten(bact.points));
        //}
    }
}

// Creates the points for a new bacteria
function Bacteria() {
    console.log("Bacteria");
    var vertices = [];

    // Distance of points from the origin
    // size = 1 corresponds to points arriving on the sphere itself, triangle will intersect
    // Sized close to one will likely result in the plane of triangle clipping through sphere
    var size = 1.045;
    console.log(size);

    vertices.push(vec4(size * Math.sin(get_altitude(altitude+1.1)) * Math.cos(get_azimuth(2.5)),
                        size * Math.sin(get_altitude(altitude+1.1)) * Math.sin(get_azimuth(2.5)),
                        size * Math.cos(get_altitude(altitude+1.1)),
                        1));

    vertices.push(vec4(size * Math.sin(get_altitude(altitude+1.4)) * Math.cos(get_azimuth(2.5)),
                        size * Math.sin(get_altitude(altitude+1.4)) * Math.sin(get_azimuth(2.5)),
                        size * Math.cos(get_altitude(altitude+1.4)),
                        1));

    vertices.push(vec4(size * Math.sin(get_altitude(altitude+2)) * Math.cos(get_azimuth(2.5)),
                        size * Math.sin(get_altitude(altitude+2)) * Math.sin(get_azimuth(2.5)),
                        size * Math.cos(get_altitude(altitude+2)),
                        1));
    console.log(vertices);
    return vertices;
}

function make_bacteria_grid() {

    console.log("Making bacteria grid.");

    var vertices = [];

    for(var i = 0; i < 10; i+=1) {
        for(var j = 0; j < 10; j+=1) {
            vertices.push(bacteria_point(i,j));
            num_bacteria_points++;
        }
    }

    console.log("Adding grid to buffer.");
    gl.bufferSubData(gl.ARRAY_BUFFER, index*8*2, flatten(vertices));
}


// TODO pass start and end points on the grid to generate a bacteria that grows along the outside of the sphere
function make_bacteria(start, end, row) {

    console.log("Making bacteria grid.");

    var vertices = [];

    for(var j = start; j < end; j+=0.25) {
        vertices.push(bacteria_point(row,j));
        vertices.push(bacteria_point(row+1,j));
        num_bacteria_points+=2;
    }

    console.log("Adding grid to buffer.");
    gl.bufferSubData(gl.ARRAY_BUFFER, index*8*2, flatten(vertices));
}



function bacteria_point(altitude, azimuth) {
    // Distance of points from the origin
    // size = 1 corresponds to points arriving on the sphere itself, triangle will intersect
    // Sized close to one will likely result in the plane of triangle clipping through sphere
    var size = 1.045;

    var vec = vec4(size * Math.sin(get_altitude(altitude)) * Math.cos(get_azimuth(azimuth)),
        size * Math.sin(get_altitude(altitude)) * Math.sin(get_azimuth(azimuth)),
        size * Math.cos(get_altitude(altitude)),
        1);

    console.log(vec);

    return vec;
}

function plot_new_point() {
    var vertices = [];

    var size = 1.045;



    vertices.push(vec4(size * Math.sin(get_altitude(altitude+2)) * Math.cos(get_azimuth(2.5)),
        size * Math.sin(get_altitude(altitude+2)) * Math.sin(get_azimuth(2.5)),
        size * Math.cos(get_altitude(altitude+2)),
        1));

    console.log(vertices);
}


// Move the value into the range (0-1)*Pi Radians for azimuth
// Azimuth determines the latitude of the points along the sphere
var get_altitude = function(value) {
    return (value * Math.PI)/10
};

// Move the value into the range of (0-2)*Pi Radians for azimuth
// Azimuth determines the longitude of the point along the sphere
var get_azimuth = function(value) {
    return (value * 2*Math.PI)/10;
};

// Function for the bacteria to draw over the sphere
function bacteria(){
    var b = {};
    b.points = Bacteria();
    b.color = Math.floor( Math.random() * 4); console.log(b.color);
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
        //active_bacteria--;
    };
    //active_bacteria++;
    return b;
}



// Top Level Game Control Functions moved over from Project 1

function startPressed(){
    launch();
    menuControl.style.display = 'none';
    gameView.style.display = 'block';
    gameControl.style.display = 'block';
}

function quitPressed(){
    quit();
    gameControl.style.display = 'none';
    gameView.style.display = 'none';
    menuControl.style.display = 'block';
    gameoverView.style.display = 'none';
    winView.style.display = 'none';
}

function replayPressed(){
    quit();
    launch();
    hi_score = 0;
    document.getElementById("hi_score_value").innerHTML = 0;
    gameView.style.display = 'block';
    gameoverView.style.display = 'none';
    winView.style.display = 'none';
    menuControl.style.display = 'none';
    gameControl.style.display = 'block';
}

function loseGame(){
    gameOver();
    gameControl.style.display = 'none';
    gameoverView.style.display = 'block';
}

function winGame(){
    gameOver();
    gameControl.style.display = 'none';
    winView.style.display = 'block';
}

//Lower Game Control Functions
function launch(){
    document.getElementById("score_value").innerHTML = score;
    gl.clear( gl.COLOR_BUFFER_BIT );
    console.log("Launching game session...");
    game_over = false;
    playing = true;
    document.getElementById("time_value").innerHTML = 30;

    //TODO Initialize the timed game elements

}

function quit(){
    console.log("Quitting game session...");
    // set gameover to false and reset all variables
    gameOver();
    game_over = true;
    playing = false;
}

function difficulty_up(){
    //TODO change difficulty based on 3D game
}

function gameOver(){
    //Instance of game has ended
    game_over = true;
    //TODO remove intervals and all game data once created
    score = 0;
    time = 30.0000;
    console.log("game over, values cleared");
}

function update_score(value){
    // Update the game score
    if(score < 0){
        score = 0;
        document.getElementById("score_value").innerHTML = score;
        loseGame();
    }else if (game_over == false){
        score += value;
        document.getElementById("score_value").innerHTML = score;

        if (hi_score < score) {
            hi_score = score;
            document.getElementById("hi_score_value").innerHTML = hi_score;
        }
    }

}

function countdown(){
    if(game_over != true && time > 0.00){
        time -= 1;
        console.log(time);
        document.getElementById("time_value").innerHTML = time;
    }
    else{
        //TODO player reached the time limit. Stop spawning more bacteria
        time = 0;
        document.getElementById("time_value").innerHTML = time;


    }

}

function canvasClicked(event) {
    //gets coordinates of click
    console.log("Canvas clicked");
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    // Move the canvas coordinates in range of the clipping region (-1 to 1)
    x =((x * 2/canvas.width)  -1);
    y =-1*((y * 2/canvas.height) -1);

    console.log("Y: " + y);
    console.log("X: " + x);
}





