// Define a variable to hold the background color
let bgColor = 220;

function setup() {
  // Create a drawing canvas 400 pixels wide by 400 pixels high
  createCanvas(1920, 1080); 
}

function draw() {
  // Redraw the background each frame to clear the previous circles
  background(bgColor); 
  
  // Set the fill color for the shape (Red, Green, Blue)
  fill(100, 150, 250); 
  
  // Remove the black outline from the shape
  noStroke(); 
  
  // Draw a circle at the current mouse position with a diameter of 50 pixels
  circle(mouseX, mouseY, 50); 
}

// This special p5.js function runs automatically whenever the mouse is clicked
function mousePressed() {
  // Generate a random grayscale value between 50 and 200
  bgColor = random(50, 200); 
}
