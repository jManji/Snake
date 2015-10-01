$(document).ready(function() {

    /**
     * The main game class. It is responsible for updating and
     * rendering the game's entities.
     *
     * @param ctx  The context of the canvas
     * @param w    Width of the canvas
     * @param h    Height of the canvas
     * @constructor
     */
    function Game(ctx, w, h) {
        this.ctx = ctx;
        this.w = w;
        this.h = h;
        this.speed = 1;
        this.input_processing = false;
    }
    /**
     * Starts the game. Initialises entities and sets the game loop.
     */
    Game.prototype.start = function() {
        this.snake = new Snake(1, 1, this);
        this.food = new Food(this);

        this.score = 0;
        this.set_controls();

        //Lets move the snake now using a timer which will trigger the run function
        if (typeof game_loop != "undefined") clearInterval(game_loop);
        var t = this;
        var game_loop = setInterval(function(){t.run();}, 1000/(10 + 2*this.speed));
    };
    /**
     * Bindings for game controls.
     */
    Game.prototype.set_controls = function() {
        var game = this;

        //Let's add the keyboard controls now
        $(document).keydown(function(e) {

            if (!game.input_processing) {
                game.input_processing = true;
                var key = e.which;
                //We will add another clause to prevent reverse gear
                if (key == "37" && game.snake.d != "right") game.snake.d = "left";
                else if (key == "38" && game.snake.d != "down") game.snake.d = "up";
                else if (key == "39" && game.snake.d != "left") game.snake.d = "right";
                else if (key == "40" && game.snake.d != "up") game.snake.d = "down";
            }
        });
    };
    /**
     * Resets the game.
     */
    Game.prototype.reset = function() {
        // Recreate snake and food
        this.snake = new Snake(1, 1, this);
        this.food = new Food(this);
        // Reset the score
        this.score = 0;
    };
    /**
     * Run the game, updating and rendering the entities
     */
    Game.prototype.run = function() {

        // Update first
        this.snake.update();
        this.input_processing = false;

        // Then render
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.w, this.h);
        this.ctx.strokeStyle = "black";
        this.ctx.strokeRect(0, 0, this.w, this.h);

        this.food.render(ctx);
        this.snake.render(ctx);

        //Lets paint the score
        var score_text = "Score: " + this.score;
        var speed_text = "Speed: " + this.speed;
        this.ctx.fillStyle = "black";
        this.ctx.fillText(score_text, 5, h - 20);
        this.ctx.fillText(speed_text, 5, h - 5);
    };
    /**
     * Checks collision with a 2d array. 2d array holds just some
     * 1 values.
     * @param x      x coordinate to check
     * @param y      y coordinate to check
     * @param array  2d array with 1/0 values.
     * @returns {boolean} Whether the entity with x,y coordinates
     *                    Collides with the array
     */
    Game.collision_with_2darray = function (x, y, array) {
        if(typeof array[x] !== 'undefined' && typeof array[x][y] !== 'undefined' &&
            array[x][y] === 1) {
            return true;
        }
        return false;
    };
    /**
     * Updates the game when the snake eats the food.
     */
    Game.prototype.ate_food = function () {
        this.score++;
        if (this.score % 2 === 0) {
            this.speed++;
        }

        // Reset the position;
        this.food.reset();
    };
    /**
     * Checks if a position in inside a box (canvas)
     * @param x   x coordinate of the position
     * @param y   y coordinate of the position
     * @param w   w of the box
     * @param h   h of the box
     * @param cw  Cell width
     * @returns {boolean} Whether collision occurs with a wall
     */
    Game.collision_with_wall = function (x, y, w, h, cw) {
        return (x == -1 || x == w / cw || y == -1 || y == h / cw);
    };
    /**
     * Checks if a position collides with another position
     * @param x        x coordinate to check
     * @param y        y coordinate to check
     * @param other_x  The other x coordinate
     * @param other_y  The other y coordinate
     * @returns {boolean}  Whether collision occurs with another position
     */
    Game.collision_with_entity = function (x, y, other_x, other_y) {
        return (x == other_x && y == other_y);
    };

    /**
     * Base class for all entities. Entity is every element in the game, which
     * can be rendered (usually they can also be updated, not for this kind
     * of game though)
     * @param x      x coordinate of the entity
     * @param y      y coordinate of the entity
     * @param color  Color of the entity
     * @constructor
     */
    function Entity(x, y, color) {
        this.x = x;
        this.y = y;
        this.cw = 10;
        this.color = color;
    }
    /**
     *Render the entity. By default, we treat an entity as a single square.
     *
     * @param ctx  The context of the game
     */
    Entity.prototype.render = function(ctx) {
        this.paint_cell(this.x, this.y, this.cw, ctx);
    };
    /**
     * Generic function to paint cells
     *
     * @param x    x coordinate of the entity
     * @param y    y coordinate of the entity
     * @param cw   Cell's width
     * @param ctx  Context of the game
     */
    Entity.prototype.paint_cell = function(x, y, cw, ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(x * cw, y * cw, cw, cw);
        ctx.strokeStyle = "white";
        ctx.strokeRect(x * cw, y * cw, cw, cw);
    };

    /**
     * Snake class that inherits from entity
     *
     * @type {Entity}
     */
    Snake.prototype = new Entity();
    Snake.prototype.constructor = Snake;
    function Snake(x, y, game) {
        Entity.call(this, x, y, "blue");
        this.game = game;
        this.d = "right";
        this.length = 5;       //Length of the snake
        // The 1d array holds the cells in a sequential way.
        // Using this, we can find it's head and tail
        this.snake_1darray = [];

        // The 2d array holds the cells in a hash style structure.
        // It has O(1) access for quick collision checks
        this.snake_2darray = []; //Empty array to start with

        for (var i = 0; i<= this.length - 1; i++) {
            //This will create a horizontal snake starting from the top left
            //this.snake_1darray.push({
            //    x: i,
            //    y: this.y
            //});
            this.add_cell(i, this.y);
        }
    }

    /**
     * Adds a new cell to the snake
     *
     * @param x  x coordinate of the new cell
     * @param y  y coordinate of the new cell
     */
    Snake.prototype.add_cell = function(x, y) {
        // Check to see if there already a new array on the
        // x axis. If not, create a new one.
        if (typeof this.snake_2darray[x] === 'undefined') {
            this.snake_2darray[x] = [];
        }
        this.snake_2darray[x][y] = 1;

        this.snake_1darray.unshift({x: x, y: y});
    };
    /**
     * Update function for snake. It creates new position and
     * after checking the collisions, if move the snake to
     * that position.
     */
    Snake.prototype.update = function() {
        //The movement code for the snake to come here.
        //The logic is simple
        //Pop out the tail cell and place it in front of the head cell
        var nx = this.snake_1darray[0].x;
        var ny = this.snake_1darray[0].y;
        //These were the position of the head cell.
        //We will increment it to get the new head position
        //Lets add proper direction based movement now
        if (this.d == "right") nx++;
        else if (this.d == "left") nx--;
        else if (this.d == "up") ny--;
        else if (this.d == "down") ny++;

        //Lets add the game over clauses now
        //This will restart the game if the snake hits the wall
        //Lets add the code for body collision
        //Now if the head of the snake bumps into its body, the game will restart
        if (Game.collision_with_wall(nx, ny, this.game.w, this.game.h, this.cw) ||
            Game.collision_with_2darray(nx, ny, this.snake_2darray)) {
            game.reset();
        }

        //Lets write the code to make the snake eat the food
        //The logic is simple
        //If the new head position matches with that of the food,
        //Create a new head instead of moving the tail
        var tail;
        if (Game.collision_with_entity(nx, ny, this.game.food.x, this.game.food.y)) {
            tail = {
                x: nx,
                y: ny
            };
            this.game.ate_food();
        }
        else {
            tail = this.snake_1darray.pop(); //pops out the last cell
            delete this.snake_2darray[tail.x][tail.y];
            tail.x = nx;
            tail.y = ny;
        }
        // Puts back the tail as the first cell

        this.add_cell(tail.x, tail.y);
    };
    /**
     * Overridden function for render. Instead of rendering a single
     * cell, we iterrate through the list of entities and render each one
     *
     * @param ctx  Context of the game
     */
    Snake.prototype.render = function(ctx) {
        for (var i = 0; i < this.snake_1darray.length; i++) {
            var c = this.snake_1darray[i];
            //Let's paint 10px wide cells
            this.paint_cell(c.x, c.y, this.cw, ctx);
        }
    };

    /**
     * Food entity that inherits from Entity class.
     *
     * @type {Entity}
     * @constructor
     */
    Food.prototype = new Entity();
    Food.prototype.constructor = Food;
    function Food(game) {
        this.game = game;
        var pos = this.get_new_pos();
        Entity.call(this,
            pos.x,
            pos.y,
            "green");
    }

    /**
     * Searches for a new position in the map to place the food, that
     * does not collide with the snake.
     * @returns {{x: number, y: number}}
     */
    Food.prototype.get_new_pos = function() {
        var new_pos_found = false;
        var new_x = 0;
        var new_y = 0;
        // Avoid creating new food on the snake
        while (!new_pos_found) {
            new_x = Math.round(Math.random() * (game.w - this.cw) / this.cw);
            new_y = Math.round(Math.random() * (game.h - this.cw) / this.cw);
            if (!Game.collision_with_2darray(new_x, new_y, game.snake.snake_2darray)) {
                new_pos_found = true;
            }
        }
        return {x: new_x, y: new_y};
    };
    /**
     * Resets the food position. It searches for available positions and
     * updates the current food to those.
     */
    Food.prototype.reset = function() {
        var pos = this.get_new_pos();
        this.x = pos.x;
        this.y = pos.y;
    };

    //Canvas stuff
    var canvas = $("#canvas")[0];
    var ctx = canvas.getContext("2d");
    var w = $("#canvas").width();
    var h = $("#canvas").height();

    // Run the game
    var game = new Game(ctx, w, h);
    game.start();
});