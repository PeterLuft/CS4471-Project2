// Canvas and glsl contexts
var canvas;
var gl;
var program;

// Arrays to hold sphere points and sphere normal vectors for lighting
// Keep the indices for the vertex arrays so we can draw them in the order required to have triangles
var sphere_normals = [];
var sphere_points = [];
var sphere_index = [];
var index = 0;
var latitude = 60;
var longitude = 60;
var sphere_scalor = 1.72;
var drag_force = 0.05;
var velocity = 0;
var acceleration = 1.2;
var max_velocity = 4;

var near = -10;
var far = 10;
var radius = 1;
var theta  = 0.0;
var phi = 0.0;

var left = -3.0;
var right = 3.0;
var ytop = 3.0;
var bottom = -3.0;

var lightPosition = vec4(1.0, 1.0, 1.2, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialShininess = 10.0;

var modelViewMatrix, projectionMatrix, scalorMatrix, translationMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, scalorMatrixLoc, translationMatrixLoc;
var colorMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var oscillator = 0;


// GAME VARIABLES
var bacteria_list = [];
var bacteria_counter = 0;
var score = 0;
var hi_score = 0;
var game_over = false;
var playing = false;
var bacteria_colors;
var sphere_color;

var bacteria_default_size = 0.3;
var bacteria_protrusion = 2.8;
var bacteria_collision_scale = sphere_scalor + bacteria_protrusion/right;

// References to HTML views
var gameoverView;
var winView;
var gameControl;
var menuControl;
var gameView;
var lightingEnabled = true;

var buffer_id;
var vertex_color_buffer;
var vertex_color_attribute;

// Key event handler for changing variables and rotating the sphere
window.onkeydown = function(e){

    var key = e.keyCode ? e.keyCode : e.which;
    if(key ==65 || key == 37){
        // accelerate the sphere rotation left
        if (velocity > -max_velocity) {
            velocity -= acceleration;
        }
        //theta += 0.05 *velocity;
    }
    else if(key == 39 || key == 68){
        // accelerate the sphere rotation right
        if (velocity < max_velocity) {
            velocity += acceleration;
        }
        //theta -= 0.05 * velocity;
    }
};

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );

    canvas.addEventListener('click', canvasClicked);

    // Setting up HTML references
    menuControl = document.getElementsByClassName("menu-control")[0];
    gameControl = document.getElementById("game-control");
    gameoverView = document.getElementById("gameover-view");
    winView = document.getElementById("win-view");
    gameView = document.getElementById("game-view");

    gameControl.style.display = 'none';
    gameView.style.display = 'none';
    gameoverView.style.display = 'none';
    winView.style.display = 'none';

    gl = WebGLUtils.setupWebGL(canvas);
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    // set the colors bacteria could be
    bacteria_colors = [
        [1.00, 0.42, 0.84, 1],    // Pink
        [50.0/255, 62.0/255, 135.0/255,  1.0],    // Blue
        [113/255, 224/255, 150/255, 1.0],    // Green
        [138/255, 50/255, 197/255, 1.0],    // Yellow
        [33.0/255, 178.0/255, 171.0/255, 1.0]   // Marine
    ];

    sphere_color = [0.0/255, 59/255, 155.0/255, 1.0];  // Yellow

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Establish lighting matrix products
    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    // Calculate a sphere, given the number of lines of latitude and longitude
    calculate_sphere(latitude, longitude);
    bacteria_list.push(Bacteria());
    console.log("Number of bacteria: " + bacteria_list.length);

    // Buffer to hold the normal data for the sphere
    nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(sphere_normals), gl.STATIC_DRAW );
    //gl.bufferSubData(gl.ARRAY_BUFFER, 0, );

    // Buffer to hold the vertex data for the sphere
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, 8*1024*1024, gl.DYNAMIC_DRAW );
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(sphere_points));

    // Buffer to hold element array buffer data for the sphere's vertex order
    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphere_index), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);

    // Establish vertex attributes for the point and normal array data
    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray(vNormal);

    // Get the location of model view and projection matrices
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    scalorMatrixLoc = gl.getUniformLocation( program, "scalorMatrix");
    translationMatrixLoc = gl.getUniformLocation( program, "translationMatrix");
    colorMatrixLoc = gl.getUniformLocation( program, "vColor");

    // Establish the lighting uniforms with globally defined vertices above
    gl.uniform4fv( gl.getUniformLocation(program, "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"),flatten(lightPosition) );
    gl.uniform1f (gl.getUniformLocation(program, "lightingEnabled"), lightingEnabled ? 1.0 : 0.0);
    gl.uniform1f( gl.getUniformLocation(program, "shininess"),materialShininess );

    console.log(bacteria_list[0]);

    //render();
};

// Render shapes to the screen
function render(){

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(radius*Math.sin(theta)*Math.cos(phi),
        radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));

    modelViewMatrix = lookAt(eye, at , up);
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    translationMatrix = c_translate(0, 0, 0);
    scalorMatrix = simple_scale(sphere_scalor);

    // Update the shader data for program matrices
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    gl.uniformMatrix4fv(translationMatrixLoc, false, flatten(translationMatrix));
    gl.uniformMatrix4fv(scalorMatrixLoc, false, flatten(scalorMatrix));

    // Draw the main sphere
    gl.uniform4fv(colorMatrixLoc, sphere_color);
    gl.drawElements(gl.TRIANGLES, index, gl.UNSIGNED_SHORT, 0);

    // Draw the bacteria
    for( var i = 0; i < bacteria_list.length; i++) {
        if (bacteria_list[i].alive == true) {
            gl.uniformMatrix4fv(scalorMatrixLoc, false, flatten(simple_scale(bacteria_list[i].size))); // Set the uniform for scaling this bacteria
            gl.uniformMatrix4fv(translationMatrixLoc, false, flatten(c_translate(bacteria_list[i].x, bacteria_list[i].y, bacteria_list[i].z))); // Set the uniform for translating this attribute
            gl.uniform4fv(colorMatrixLoc, bacteria_colors[bacteria_list[i].color]);
            gl.drawElements(gl.TRIANGLES, index, gl.UNSIGNED_SHORT, 0); // Draw the sphere buffer with the appropriate scaling and translation to make it appear as bacteria
        }
    }
    window.requestAnimFrame(render);
}



function calculate_sphere (latitude, longitude) {
    for (var j=0; j <= latitude; j++) {

        // For each latitude point, calculate the longitude column data
        var theta = j * Math.PI / latitude;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var i = 0; i <= longitude; i++) {

            // Determine the order of the vertices during the render
            var first = (j * (longitude + 1)) + i;
            var second = first + longitude + 1;
            sphere_index.push(first);
            sphere_index.push(second);
            sphere_index.push(first + 1);
            sphere_index.push(second);
            sphere_index.push(second + 1);
            sphere_index.push(first + 1);
            index += 6; // Number of points added to the index each loop

            // For each longitude value calculate the vertex normals for lighting and points for drawing
            var phi = i * 2 * Math.PI / longitude;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            // Calculate x, y, and z in terms of coordinates on the sphere surface
            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;

            // Sphere normal vectors are saved to be used for lighting calculations
            sphere_normals.push(vec4(x, y, z, 0));

            // Sphere points are saved to be loaded into the buffer and used for drawing
            sphere_points.push(vec4(radius * x, radius * y, radius * z, 1));

        }
    }
}

function canvasClicked(event) {
    //gets coordinates of click
    console.log("Canvas clicked");
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    // Move the canvas coordinates in range of the clipping region (-1 to 1)
    x = ((x * 2/canvas.width)  -1);
    y =- 1*((y * 2/canvas.height) -1);

    console.log("Y: " + y);
    console.log("X: " + x);

    mouse_collision_check({x: x, y: y});
}


// Create a scalor matrix
function c_scale(sx, sy, sz) {
    return [
        sx, 0,  0,  0,
        0, sy,  0,  0,
        0,  0, sz,  0,
        0,  0,  0,  1
    ];
}

// Create a scalor matrix
function simple_scale(s) {
    return [
        s, 0,  0,  0,
        0, s,  0,  0,
        0,  0, s,  0,
        0,  0,  0,  1
    ];
}

// Create a translation matrix
function c_translate (tx, ty, tz) {
    return [
        1,  0,  0,  0,
        0,  1,  0,  0,
        0,  0,  1,  0,
        tx, ty, tz, 1
    ];
}

// GAME METHODS

// Game timers
setInterval(grow_bacteria, 100);
setInterval(spawn_bacteria, 1000);
setInterval(exert_drag, 32);
setInterval(bacteria_collision_check, 500);

// Holds information about a single bacteria
function Bacteria() {

    var b = {};
    var i = Math.floor((Math.random() * latitude));
    var j = Math.floor((Math.random() * latitude));
    var origin_distance = radius*sphere_scalor + bacteria_default_size + bacteria_protrusion;

    b.x = origin_distance * Math.cos(i * 2 * Math.PI / longitude) *  Math.sin(j * Math.PI / latitude);
    b.y = origin_distance * Math.cos(j * Math.PI / latitude);
    b.z = origin_distance * Math.sin(i * 2 * Math.PI / longitude) * Math.sin(j * Math.PI / latitude);

    b.color = Math.floor( Math.random() * 4);
    b.alive = true;
    b.size = bacteria_default_size;
    b.order = bacteria_counter; bacteria_counter++;

    b.grow = function() { // Add another 'unit' to the bacteria

        if (b.size < bacteria_default_size + 0.035) {
            b.size += 0.0005;
        }else{
            decrease_score();
        }
    };

    b.kill = function() {
        b.alive = false;
        increase_score();
    };
    return b;
}

function decrease_score() {
    score--;
    if (score == 0) {
        game_over = true;
    }
}

function increase_score() {
    score += 5;
    if (score >= hi_score) {
        hi_score = score;
    }
}

function grow_bacteria() {
    for (var i = 0; i< bacteria_list.length; i++) {
        bacteria_list[i].grow();
    }
    oscillator+=0.017;
}

function spawn_bacteria() {
    bacteria_list.push(Bacteria());
}

function exert_drag() {
    if (velocity > 0) {
        velocity -= drag_force;
    }else if(velocity < 0) {
        velocity += drag_force;
    }

    if (velocity > -0.01 && velocity < 0.01) {
        velocity =0;
    }

    theta -= 0.01 * velocity;
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

    render();

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

// Checks all bacteria for collision
// On collision bacteria merge by setting the color of the younger bacteria to that of the older
function bacteria_collision_check () {
    for (var i = 0; i < bacteria_list.length; i++) {
        if(bacteria_list[i].alive == true){
            for (var j = i+1; j < bacteria_list.length; j++) {
                if (bacteria_list[j].alive == true) {
                    if (bacteria_collision(bacteria_list[i], bacteria_list[j])) {
                        if(bacteria_list[i].order > bacteria_list[j].order){
                            console.log("Merging i: " + i + " j: " + j);
                            bacteria_list[i].color = bacteria_list[j].color;
                            bacteria_list[i].order = bacteria_list[j].order;
                        }
                        else{
                            console.log("Merging j: " + j + " i: " + i);
                            bacteria_list[j].color = bacteria_list[i].color;
                            bacteria_list[j].order = bacteria_list[i].order;
                        }
                    }
                }
            }
        }
    }
}

// Returns boolean indicating if two bacteria overlap
// Calculates the distance between the centers of both bacteria, then checks if the sum of radius'
// are greater than the distance
function bacteria_collision(bact1, bact2) {
    var distance = Math.sqrt(Math.pow((bact1.x - bact2.x), 2) +
                            Math.pow((bact1.y - bact2.y), 2) +
                            Math.pow((bact1.z - bact2.z), 2));
    return distance < (bact1.size*bacteria_collision_scale + bact2.size*bacteria_collision_scale);
}


// Takes a point and a bacterial sphere and determines if they intersect
function point_bacteria_collision(point, bact, size) {
    var distance = Math.sqrt((point.x - bact[0]) * (point.x - bact[0]) +
                            (point.y - bact[1]) * (point.y - bact[1]) +
                            (point.z - bact[2]) * (point.z - bact[2]));

    console.log("distance: " + distance);
    console.log("size: " + size/right);

    return distance < size/right; // right is used as half the size of clip space to scale size of sphere
}

// Determine if the mouse's 3D coordinates intersect any of the bacterial spheres
// Applies the same matrix transformation as the shader to get the center of each bacteria in clip space
// Moves the mouse's coordinates into 3D by taking each bacteria's Z-coord in turn
function mouse_collision_check(mouse) {

    var collision_point;

    var matrix = mult(projection_matrix(), modelview_matrix());

    console.log("Mouse collision check.");
    for(var i = 0; i < bacteria_list.length; i++) {

        if (bacteria_list[i].alive == true) {

            var s_matrix = scale(bacteria_list[i].size, bacteria_list[i].size, bacteria_list[i].size);
            var f_matrix = mult(matrix, s_matrix);
            var t_matrix = mult(f_matrix, translate(bacteria_list[i].x, bacteria_list[i].y, bacteria_list[i].z));

            // Default sphere is centered at the origin, so apply the transformation matrix to the point at the origin to
            // Get the origin of the sphere
            collision_point = vector_mult(t_matrix, vec4(0, 0, 0, 1));

            // Mouse's representation in 3D space
            var mouse_map = {x: mouse.x, y: mouse.y, z: collision_point[2]};

            var hit = point_bacteria_collision(mouse_map, collision_point, bacteria_list[i].size);

            // TODO: take the bacteria merger into account
            if (hit == true) {
                console.log("Mouse collides with bacteria " + i);
                bacteria_list[i].kill();
                hit = false;
                kill_merged_bacteria(bacteria_list[i]);
            }
        }
    }
}

// Recursively kill all bacteria touching the given bacteria, or a neighbour of that bacteria
function kill_merged_bacteria(bacteria) {
    for (var j = 0; j < bacteria_list.length; j++) {
        if (bacteria_list[j].alive ==  true) {
            if (bacteria_collision(bacteria, bacteria_list[j])) {
                bacteria_list[j].kill();
                kill_merged_bacteria(bacteria_list[j]);
            }
        }
    }
}


// Adapted MV mult method to take a vector as the second argument
function vector_mult( m, v )
{
    var m_2 ={x : (m[0][0] * v[0]) + (m[0][1] * v[1]) + (m[0][2] * v[2]) + (m[0][3] * v[3]),
            y : m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2] + m[1][3] * v[3],
            z : m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2] + m[2][3] * v[3]};

    return vec4(m_2.x, m_2.y, m_2.z, 1);
}

// Find out where the center of the sphere is moved to in the matrix and
// Generate a matrix that can be used to recreate that position in javascript
// So collision can take place
function modelview_matrix() {

    var eye = vec3(radius*Math.sin(theta)*Math.cos(phi),
        radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));

    // Generate the model view matrix
    return lookAt(eye, at , up);
}

function projection_matrix() {
    // Generate the projection matrix
    return ortho(left, right, bottom, ytop, near, far);
}

function toggleLighting() {
    if (lightingEnabled == true) {
        lightingEnabled = false;
    }else{
        lightingEnabled = true
    }
    gl.uniform1f(gl.getUniformLocation(program, "lightingEnabled"), lightingEnabled ? 1.0 : 0.0);
}