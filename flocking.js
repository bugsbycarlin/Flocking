/*
Flocking
Copyright 2014
Matthew Carlin

An implementation of http://www.red3d.com/cwr/boids/

Use or redistribute as you see fit.

a bird is an object with properties x, y, speed, angle, and
flap_num. birds have slightly randomized speed. they start
in random places with random angles. in general the flocking
algorithm adjusts the bird angle based on other nearby
birds.

*/


//
// adjustable starting parameters
//
such_birds = 100;
arena_width = 2048;
arena_height = 1536;
nbhd_radius = 150;


//
// simulation variables
//
birds = []

background = new Image();
background.src = "Art/bg.jpg";

bird_images = []
for (var i = 1; i <= 14; i++) {
  bird_images[i] = new Image();
  bird_images[i].src = "Art/Dove" + i + ".png";
}

viewpoint_x = 512;
viewpoint_y = 350;

MATCH_VIEWPOINT = 0;
FOLLOW_VIEWPOINT = 1;


//
// debug variables
//
debug_alignment = false;
debug_separation = false;
debug_cohesion = false;
debug_neighborhood = false;
debug_center = false;

debug_bird_num = 0;
debug_alignment_vector_x = 0;
debug_alignment_vector_y = 0;
debug_separation_vector_x = 0;
debug_separation_vector_y = 0;
debug_cohesion_vector_x = 0;
debug_cohesion_vector_y = 0;
debug_center_vector_x = 0;
debug_center_vector_y = 0;


//
// initialization functions
//
function initialize() {
  var canvas = document.getElementById('canvas');
  canvas.width = 1024;
  canvas.height = 700;
  context = canvas.getContext('2d');

  canvas.style.visibility = 'visible';
  var loadingdiv = document.getElementById('loadingDiv');
  loadingdiv.style.visibility = 'hidden';

  create_birds();

  adjust_viewpoint(MATCH_VIEWPOINT);

  setInterval(update_simulation,40);
}

function create_birds() {
  for(var i = 0; i < such_birds; i++) {
    var bird = [];
    bird.x = Math.floor(Math.random()*arena_width);
    bird.y = Math.floor(Math.random()*arena_height);
    bird.speed = 95 + Math.floor(Math.random()*30);
    bird.angle = Math.random() * 2 * Math.PI - Math.PI;
    bird.flap_num = Math.floor(Math.random()*14) + 1;
    bird.neighbor_of_debug_bird = false;
    birds.push(bird);
  }

  debug_bird_num = Math.floor(Math.random() * such_birds);
}


//
// simulation update functions
//
function update_simulation() {

  adjust_bird_angles();

  adjust_bird_positions();

  adjust_viewpoint(FOLLOW_VIEWPOINT);

  render();
}

function adjust_bird_angles() {

  // reset debug info
  for(var i = 0; i < such_birds; i++) {
    var bird = birds[i];
    bird.neighbor_of_debug_bird = false;
  }

  // for each bird, find that bird's neighbors, and use them to calculate
  // separation, alignment, and cohesion. also, check if the bird has strayed
  // outside the arena walls. compose a target vector from all this information,
  // and adjust the bird's angle to seek the target vector.
  for(var i = 0; i < such_birds; i++) {
    var bird = birds[i];

    var neighborhood_count = 0;

    var neighborhood_center_x = 0;
    var neighborhood_center_y = 0;

    var alignment_angle = 0;
    var alignment_vector_x = 0;
    var alignment_vector_y = 0;

    var separation_vector_x = 0;
    var separation_vector_y = 0;

    var cohesion_vector_x = 0;
    var cohesion_vector_y = 0;

    var center_vector_x = 0;
    var center_vector_y = 0;

    var neighbors = [];
    for(var j = 0; j < such_birds; j++) {
      if (j != i) {
        neighbor = birds[j];

        // get the distance to the neighbor bird
        var d = distance(bird.x,bird.y,neighbor.x,neighbor.y);

        // get the angle to the neighbor bird (relative to 0)
        var raw_angle_to_neighbor = Math.atan2(neighbor.y - bird.y, neighbor.x - bird.x);
        // now subtract the main bird's angle, so we have the relative
        // angle from the main bird to the neighbor bird.
        angle_to_neighbor = raw_angle_to_neighbor - bird.angle;
        angle_to_neighbor = normalize(angle_to_neighbor);

        // if the neighbor bird is within the neighborhood radius,
        // and the angle is roughly in front of the main bird,
        // the neighbor bird *is* a neighbor.
        if(d < nbhd_radius 
           && angle_to_neighbor < 0.75 * Math.PI
           && angle_to_neighbor > -0.75 * Math.PI) {

          neighborhood_count += 1;

          neighborhood_center_x += neighbor.x;
          neighborhood_center_y += neighbor.y;

          alignment_angle += neighbor.angle;

          separation_vector_x += ((nbhd_radius - d) / (1.0 * nbhd_radius)) * -1 * Math.cos(raw_angle_to_neighbor);
          separation_vector_y += ((nbhd_radius - d) / (1.0 * nbhd_radius)) * -1 * Math.sin(raw_angle_to_neighbor);
          
          if (debug_neighborhood && i == debug_bird_num) {
            neighbor.neighbor_of_debug_bird = true;
          }
        }
      }
    }

    if (neighborhood_count > 0) {

      neighborhood_count *= 1.0; // force float

      var turn = 0;

      alignment_angle /= neighborhood_count;
      neighborhood_center_x /= neighborhood_count;
      neighborhood_center_y /= neighborhood_count;

      // alignment vector
      alignment_vector_x = 40 * Math.cos(alignment_angle);
      alignment_vector_y = 40 * Math.sin(alignment_angle);

      // separation vector
      separation_vector_x *= 40;
      separation_vector_y *= 40;

      // cohesion vector
      cohesion_angle = Math.atan2(neighborhood_center_y - bird.y, neighborhood_center_x - bird.x);
      cohesion_vector_x = 40 * Math.cos(cohesion_angle);
      cohesion_vector_y = 40 * Math.sin(cohesion_angle);  
      
    }
    else
    {
      // just alignment vector

      alignment_vector_x = 40 * Math.cos(bird.angle);
      alignment_vector_y = 40 * Math.sin(bird.angle);
    }

    // centering vector

    center_x = arena_width / 2.0 - bird.x;
    center_y = arena_height / 2.0 - bird.y;
    centering_angle = Math.atan2(center_y, center_x);
    center_vector_x = 40 * Math.cos(centering_angle);
    center_vector_y = 40 * Math.sin(centering_angle);

    if(i == debug_bird_num) {
      if(debug_alignment) {
        debug_alignment_vector_x = alignment_vector_x;
        debug_alignment_vector_y = alignment_vector_y;
      }

      if (debug_separation) {
        debug_separation_vector_x = separation_vector_x;
        debug_separation_vector_y = separation_vector_y;
      }

      if(debug_cohesion) {
        debug_cohesion_vector_x = cohesion_vector_x;
        debug_cohesion_vector_y = cohesion_vector_y;
      }

      if(debug_center) {
        debug_center_vector_x = center_vector_x;
        debug_center_vector_y = center_vector_y;
      }
    }

    // special sauce weights.
    // "a handful of alignment, a dash of separation,
    // a dollop of cohesion, and just a pinch of center"
    a = 1.0;
    b = 0.5;
    c = 1.5;
    d = 0.25;
      
    var target_vector_x = a * alignment_vector_x + 
        b * separation_vector_x + 
        c * cohesion_vector_x + 
        d * center_vector_x;
    var target_vector_y = a * alignment_vector_y +
        b * separation_vector_y +
        c * cohesion_vector_y +
        d * center_vector_y;

    seek(bird, target_vector_x, target_vector_y)

  }
}

function adjust_bird_positions() {
  for(var i = 0; i < such_birds; i++) {
    var bird = birds[i];
    
    bird.flap_num += 1;
    if (bird.flap_num > 14) {
      bird.flap_num = 1;
    }

    bird.x += Math.cos(bird.angle) * bird.speed / 40.0;
    bird.y += Math.sin(bird.angle) * bird.speed / 40.0;
  }
}

function adjust_viewpoint(tracking_type) {

  // calculate the center of mass of all birds, and then (depending on
  // tracking type), either match it or follow it.
  var bird_center_x = 0;
  var bird_center_y = 0;

  for(var i = 0; i < such_birds; i++) {
    bird = birds[i];
    
    bird_center_x += bird.x;
    bird_center_y += bird.y;
  }

  bird_center_x /= 1.0 * such_birds;
  bird_center_y /= 1.0 * such_birds;

  if (tracking_type == MATCH_VIEWPOINT) {
    viewpoint_x = bird_center_x;
    viewpoint_y = bird_center_y;
  }
  else if(tracking_type == FOLLOW_VIEWPOINT) {
    viewpoint_x = 0.97 * viewpoint_x + 0.03 * bird_center_x;
    viewpoint_y = 0.97 * viewpoint_y + 0.03 * bird_center_y;
  }

  // make sure the viewpoint doesn't follow outside the acceptable arena space.
  if (viewpoint_x < 512) {
    viewpoint_x = 512;
  }
  if (viewpoint_x > arena_width - 512) {
    viewpoint_x = arena_width - 512;
  }
  if (viewpoint_y < 350) {
    viewpoint_y = 350;
  }
  if (viewpoint_y > arena_height - 350) {
    viewpoint_y = arena_height - 350;
  }

}

function render() {
  if (context == null) {
    return;
  }

  context.clearRect(0, 0, 1024, 700);

  context.drawImage(background, 0 - viewpoint_x + 512, 0 - viewpoint_y + 350, arena_width, arena_height);

  var debug_bird = birds[debug_bird_num];

  if (debug_neighborhood) {
    birdBox(debug_bird.x, debug_bird.y, "#CCCCCC");

    for(var i = 0; i < such_birds; i++) {
      var bird = birds[i];
      if (bird.neighbor_of_debug_bird) {
        birdBox(bird.x, bird.y, "#ee83ee");
      }
    }
  }

  if(debug_alignment) {
    vector(debug_bird.x - viewpoint_x + 512, 
        debug_bird.y - viewpoint_y + 350,
        debug_alignment_vector_x,
        debug_alignment_vector_y,
        "#EE2222"); // red for alignment
  }

  if(debug_separation) {
    vector(debug_bird.x - viewpoint_x + 512, 
        debug_bird.y - viewpoint_y + 350,
        debug_separation_vector_x,
        debug_separation_vector_y,
        "#22EE22"); // green for separation
  }

  if (debug_cohesion) {
    vector(debug_bird.x - viewpoint_x + 512, 
        debug_bird.y - viewpoint_y + 350,
        debug_cohesion_vector_x,
        debug_cohesion_vector_y,
        "#2222EE"); // blue for cohesion
  }

  if (debug_center) {
    vector(debug_bird.x - viewpoint_x + 512, 
        debug_bird.y - viewpoint_y + 350,
        debug_center_vector_x,
        debug_center_vector_y,
        "#991199"); // purple for center
  }

  for(var i = 0; i < such_birds; i++) {
    var bird = birds[i];

    context.translate(bird.x - viewpoint_x + 512, bird.y - viewpoint_y + 350);
    context.rotate(Math.PI * 0.25 + bird.angle);
    context.drawImage(bird_images[bird.flap_num], -20, -20);
    context.rotate(Math.PI * -0.25 - bird.angle);
    context.translate(-1 * (bird.x - viewpoint_x + 512), -1 * (bird.y - viewpoint_y + 350));
  }

}


//
// helper functions
//
function seek(bird, vector_x, vector_y) {
  var angle_to_target = Math.atan2(vector_y, vector_x);
  angle_to_target -= bird.angle;
  angle_to_target = normalize(angle_to_target);

  if (angle_to_target > 0.1) {
    bird.angle += 0.02 * Math.PI;
  }
  else if(angle_to_target < -0.1) {
    bird.angle -= 0.02 * Math.PI;
  }

  bird.angle = normalize(bird.angle);
}


function distance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

// mod r so it is within -Math.PI to Math.PI.
function normalize(r) {
  return (r + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
}

function birdBox(x, y, color) {
  context.strokeStyle = color;

  context.lineWidth = 2;

  context.beginPath();
  context.moveTo(x - viewpoint_x + 512 - 20, y - viewpoint_y + 350 - 20);
  context.lineTo(x - viewpoint_x + 512 + 20, y - viewpoint_y + 350 - 20);
  context.lineTo(x - viewpoint_x + 512 + 20, y - viewpoint_y + 350 + 20);
  context.lineTo(x - viewpoint_x + 512 - 20, y - viewpoint_y + 350 + 20);
  context.lineTo(x - viewpoint_x + 512 - 20, y - viewpoint_y + 350 - 20);
  context.stroke();
}

function vector(x, y, v, w, color) {
  context.strokeStyle = color;

  context.lineWidth = 2;

  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + v, y + w);
  context.stroke();
}