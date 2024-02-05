const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser'); // for parsing JSON requests
const cors = require('cors');
const app = express();
const port = 2000; // Change this to your desired port

// Middleware for parsing JSON requests
app.use(bodyParser.json());

//Enable CORS from all origins
app.use(cors())

// Connect to your SQLite database
const db = new sqlite3.Database('./database/recipesDB.db', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the database');
  }
});

// Define the API endpoints
// Redirect the home to all recipes
app.get('/', (req, res) => {
    res.redirect('/recipes');
});

// Define a route for help and contact
app.get('/help-contact', (req, res) => {
    // The HTML file will be served automatically from the 'public' directory
    res.sendFile(__dirname + '/help-contact.html');
});

//Get all recipes
app.get('/recipes', (req, res) => {
    db.all('SELECT * FROM Recipes', (err, rows) => {
        if (err) {
            console.error('Error fetching recipes:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json(rows); // Return the list of recipes as JSON response
    });
});

// Get recipes by cuisine
app.get('/recipes/cuisine/:cuisineId', (req, res) => {
    const { cuisineId } = req.params;
    db.all('SELECT * FROM Recipes WHERE cuisine_id = ?', [cuisineId], (err, rows) => {
        if (err) {
            console.error('Error fetching recipes by cuisine:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json(rows);
    });
});

// Get recipes without a specific allergy
app.get('/recipes/no-allergy/:allergyId', (req, res) => {
    const { allergyId } = req.params;
    db.all(`
        SELECT r.* 
        FROM Recipes r LEFT JOIN RecipeAllergiesInfo rai ON r.recipe_id = rai.recipe_id
        WHERE rai.recipe_id IS NULL OR rai.allergy_id <> ?;`, 
        [allergyId], (err, rows) => {
        if (err) {
        console.error('Error fetching recipes without allergy:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
        }
        res.json(rows);
    });
});

// Get recipes by goal
app.get('/recipes/goal/:goalId', (req, res) => {
    const { goalId } = req.params;
    db.all('SELECT * FROM Recipes WHERE goal_id = ?', [goalId], (err, rows) => {
        if (err) {
            console.error('Error fetching recipes by goal:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json(rows); // Return the list of recipes for the specified goal as a JSON response
    });
});

// Get a recipe with all information, including ingredients, allergies, dietary information, and instructions
app.get('/recipes/:recipeId', (req, res) => {
    const { recipeId } = req.params;
  
    // Implement logic to fetch a recipe with all its information from the database
    db.get(`
      SELECT r.recipe_id, r.recipe_name, r.recipe_description, r.image_url, c.name AS cuisine, g.name AS goal
      FROM Recipes r
      LEFT JOIN Cuisines c ON r.cuisine_id = c.cuisine_id
      LEFT JOIN Goals g ON r.goal_id = g.goal_id
      WHERE r.recipe_id = ?;
    `, [recipeId], (err, recipe) => {
      if (err) {
        console.error('Error fetching recipe with basic information:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
  
      if (!recipe) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }
  
      // Fetch and attach other information such as ingredients, allergies, dietary info, and instructions
      // You'll need additional queries to get this information.
  
      // Example: Fetching ingredients for the recipe
      db.all(`
        SELECT i.name, ri.quantity, i.unit
        FROM RecipeIngredients ri
        JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id
        WHERE ri.recipe_id = ?;
      `, [recipeId], (err, ingredients) => {
        if (err) {
          console.error('Error fetching ingredients:', err.message);
          res.status(500).json({ error: 'Internal server error' });
          return;
        }
  
        recipe.ingredients = ingredients;
  
        // Fetching allergies for the recipe
        db.all(`
          SELECT ai.name AS allergy
          FROM RecipeAllergiesInfo rai
          JOIN AllergiesInformation ai ON rai.allergy_id = ai.allergy_id
          WHERE rai.recipe_id = ?;
        `, [recipeId], (err, allergies) => {
          if (err) {
            console.error('Error fetching allergies:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
          }
  
          recipe.allergies = allergies;
  
          // Fetching dietary information for the recipe
          db.all(`
            SELECT di.name AS dietary_info
            FROM RecipeDietaryInfo rdi
            JOIN DietaryInformation di ON rdi.diet_id = di.diet_id
            WHERE rdi.recipe_id = ?;
          `, [recipeId], (err, dietaryInfo) => {
            if (err) {
              console.error('Error fetching dietary information:', err.message);
              res.status(500).json({ error: 'Internal server error' });
              return;
            }
  
            recipe.dietaryInfo = dietaryInfo;
  
            // Fetching instructions for the recipe
            db.all(`
              SELECT instruction_id, step_number, StepInstruction
              FROM InstructionStep
              WHERE recipe_id = ?;
            `, [recipeId], (err, instructions) => {
              if (err) {
                console.error('Error fetching instructions:', err.message);
                res.status(500).json({ error: 'Internal server error' });
                return;
              }
  
              recipe.instructions = instructions;
  
              res.json(recipe); // Return the recipe with all information as a JSON response
            });
          });
        });
      });
    });
});


//ADD API
// Add a new cuisine
app.post('/cuisines/add', (req, res) => {
    const { name } = req.body;
    // Check if the cuisine name is provided
    if (!name) {
      res.status(400).json({ error: 'Cuisine name is required' });
      return;
    }
    // Insert the new cuisine into the Cuisines table
    db.run('INSERT INTO Cuisines (name) VALUES (?)', [name], function (err) {
      if (err) {
        console.error('Error adding cuisine:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      // Return the newly added cuisine with its ID
      res.json({ cuisine_id: this.lastID, name });
    });
});

// Add an ingredient to a recipe
app.post('/recipes/:recipeId/add/ingredients', (req, res) => {
    const { recipeId } = req.params;
    const { name, quantity, unit } = req.body;
  
    // Check if the recipe exists
    db.get('SELECT * FROM Recipes WHERE recipe_id = ?', [recipeId], (err, recipe) => {
      if (err) {
        console.error('Error checking recipe existence:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      if (!recipe) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }
  
      // Check if the ingredient exists in the Ingredients table
      db.get('SELECT * FROM Ingredients WHERE name = ?', [name], (err, ingredient) => {
        if (err) {
          console.error('Error checking ingredient existence:', err.message);
          res.status(500).json({ error: 'Internal server error' });
          return;
        }
  
        // If the ingredient doesn't exist, insert it into the Ingredients table
        if (!ingredient) {
          db.run('INSERT INTO Ingredients (name, unit) VALUES (?, ?)', [name, unit], function (err) {
            if (err) {
              console.error('Error inserting new ingredient:', err.message);
              res.status(500).json({ error: 'Internal server error' });
              return;
            }
  
            // Continue with adding the ingredient to the RecipeIngredients table
            insertIngredientIntoRecipe();
          });
        } else {
          // The ingredient already exists, so proceed with adding it to the RecipeIngredients table
          insertIngredientIntoRecipe();
        }
      });
    });
  
    function insertIngredientIntoRecipe() {
      // Insert the ingredient into the RecipeIngredients table
      db.run('INSERT INTO RecipeIngredients (recipe_id, ingredient_id, quantity) VALUES (?, (SELECT ingredient_id FROM Ingredients WHERE name = ?), ?)', [recipeId, name, quantity], function (err) {
        if (err) {
          console.error('Error adding ingredient to the recipe:', err.message);
          res.status(500).json({ error: 'Internal server error' });
          return;
        }
  
        // Fetch the updated list of ingredients for the recipe
        db.all('SELECT i.name, ri.quantity, i.unit FROM RecipeIngredients ri JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id WHERE ri.recipe_id = ?', [recipeId], (err, ingredients) => {
          if (err) {
            console.error('Error fetching ingredients for the recipe:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
          }
  
          res.json(ingredients); // Return the updated list of ingredients as a JSON response
        });
      });
    }
});

// Add a new recipe with all information (including creating missing entities)
app.post('/recipes/add', (req, res) => {
    const {
      recipe_name,
      recipe_description,
      image_url,
      cuisine_id,
      goal_name, // Name of the goal (for creating if it doesn't exist)
      dietary_info_names, // Names of dietary information (for creating if they don't exist)
      allergies_info_names, // Names of allergies information (for creating if they don't exist)
      ingredients_data, // Array of ingredient details (name, quantity, unit)
      instructions
    } = req.body;
  
    // Check if required fields are provided
    if (!recipe_name || !cuisine_id || !goal_name || !ingredients_data || !instructions) {
      res.status(400).json({ error: 'Recipe name, cuisine ID, goal name, ingredients, and instructions are required' });
      return;
    }
  
    // Insert the new recipe into the Recipes table
    db.run('INSERT INTO Recipes (recipe_name, recipe_description, image_url, cuisine_id) VALUES (?, ?, ?, ?)', [recipe_name, recipe_description, image_url, cuisine_id], function (err) {
      if (err) {
        console.error('Error adding recipe:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
  
      const recipeId = this.lastID; // Get the ID of the newly added recipe
  
      // Create or fetch the goal ID
      db.get('SELECT goal_id FROM Goals WHERE name = ?', [goal_name], (err, goal) => {
        if (err) {
          console.error('Error checking goal existence:', err.message);
          res.status(500).json({ error: 'Internal server error' });
          return;
        }
  
        if (!goal) {
          // Create the goal if it doesn't exist
          db.run('INSERT INTO Goals (name) VALUES (?)', [goal_name], function (err) {
            if (err) {
              console.error('Error creating goal:', err.message);
              res.status(500).json({ error: 'Internal server error' });
              return;
            }
  
            const goalId = this.lastID; // Get the ID of the newly added goal
            insertRecipeData();
          });
        } else {
          // Use the existing goal ID
          const goalId = goal.goal_id;
          insertRecipeData();
        }
      });
  
      function insertRecipeData() {
        // Create or fetch dietary information IDs
        const dietaryInfoIds = [];
        if (dietary_info_names && dietary_info_names.length > 0) {
          dietary_info_names.forEach((dietary_info_name) => {
            db.get('SELECT diet_id FROM DietaryInformation WHERE name = ?', [dietary_info_name], (err, dietaryInfo) => {
              if (err) {
                console.error('Error checking dietary information existence:', err.message);
                res.status(500).json({ error: 'Internal server error' });
                return;
              }
  
              if (!dietaryInfo) {
                // Create the dietary information if it doesn't exist
                db.run('INSERT INTO DietaryInformation (name) VALUES (?)', [dietary_info_name], function (err) {
                  if (err) {
                    console.error('Error creating dietary information:', err.message);
                    res.status(500).json({ error: 'Internal server error' });
                    return;
                  }
  
                  dietaryInfoIds.push(this.lastID); // Get the ID of the newly added dietary information
                  if (dietaryInfoIds.length === dietary_info_names.length) {
                    // All dietary information has been processed
                    insertRecipe();
                  }
                });
              } else {
                // Use the existing dietary information ID
                dietaryInfoIds.push(dietaryInfo.diet_id);
                if (dietaryInfoIds.length === dietary_info_names.length) {
                  // All dietary information has been processed
                  insertRecipe();
                }
              }
            });
          });
        } else {
          insertRecipe(); // No dietary information to process
        }
  
        function insertRecipe() {
          // Create or fetch allergies information IDs
          const allergiesInfoIds = [];
          if (allergies_info_names && allergies_info_names.length > 0) {
            allergies_info_names.forEach((allergies_info_name) => {
              db.get('SELECT allergy_id FROM AllergiesInformation WHERE name = ?', [allergies_info_name], (err, allergiesInfo) => {
                if (err) {
                  console.error('Error checking allergies information existence:', err.message);
                  res.status(500).json({ error: 'Internal server error' });
                  return;
                }
  
                if (!allergiesInfo) {
                  // Create the allergies information if it doesn't exist
                  db.run('INSERT INTO AllergiesInformation (name) VALUES (?)', [allergies_info_name], function (err) {
                    if (err) {
                      console.error('Error creating allergies information:', err.message);
                      res.status(500).json({ error: 'Internal server error' });
                      return;
                    }
  
                    allergiesInfoIds.push(this.lastID); // Get the ID of the newly added allergies information
                    if (allergiesInfoIds.length === allergies_info_names.length) {
                      // All allergies information has been processed
                      insertRecipeIngredients();
                    }
                  });
                } else {
                  // Use the existing allergies information ID
                  allergiesInfoIds.push(allergiesInfo.allergy_id);
                  if (allergiesInfoIds.length === allergies_info_names.length) {
                    // All allergies information has been processed
                    insertRecipeIngredients();
                  }
                }
              });
            });
          } else {
            insertRecipeIngredients(); // No allergies information to process
          }
  
          function insertRecipeIngredients() {
            // Insert ingredients into RecipeIngredients table
            if (ingredients_data && ingredients_data.length > 0) {
              ingredients_data.forEach(({ ingredient_id, quantity}) => {
                db.run('INSERT INTO RecipeIngredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)', [recipeId, ingredient_id, quantity], (err) => {
                  if (err) {
                    console.error('Error adding ingredient:', err.message);
                  }
                });
              });
            }
  
            // Insert instructions into RecipeInstructions table
            if (instructions && instructions.length > 0) {
              instructions.forEach(({ step_number, StepInstruction }) => {
                db.run('INSERT INTO InstructionStep (recipe_id, step_number, StepInstruction) VALUES (?, ?, ?)', [recipeId, step_number, StepInstruction], (err) => {
                  if (err) {
                    console.error('Error adding instruction:', err.message);
                  }
                });
              });
            }
  
            // Return the ID of the newly added recipe
            res.json({ recipe_id: recipeId, message: 'Recipe added successfully' });
          }
        }
      }
    });
});

//UPDATE API
// Update a recipe, when an attribute is not intended to be updated; keep iti empty in the JSON
app.put('/recipes/:recipeId/update', (req, res) => {
    const { recipeId } = req.params;
    const updatedRecipe = req.body;
  
    // Check if the updated recipe data is provided
    if (!updatedRecipe) {
      res.status(400).json({ error: 'Updated recipe data is required' });
      return;
    }
    // Construct the SQL query dynamically based on the provided data
    let updateQuery = 'UPDATE Recipes SET ';
    const updateParams = [];
    const validAttributes = ['recipe_name', 'recipe_description', 'image_url', 'cuisine_id', 'goal_id'];
  
    for (const attribute in updatedRecipe) {
      if (validAttributes.includes(attribute)) {
        // Check if the value is not empty before adding it to the query
        if (updatedRecipe[attribute] !== undefined && updatedRecipe[attribute] !== '') {
          updateQuery += `${attribute} = ?, `;
          updateParams.push(updatedRecipe[attribute]);
        }
      }
    }
  
    // Remove the trailing comma and space from the query
    updateQuery = updateQuery.slice(0, -2);
  
    // Add the WHERE clause to specify the recipe to update
    updateQuery += ' WHERE recipe_id = ?';
    updateParams.push(recipeId);
  
    // Execute the dynamic SQL update query
    db.run(updateQuery, updateParams, function (err) {
      if (err) {
        console.error('Error updating recipe:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
  
      if (this.changes === 0) {
        // No rows were affected, indicating that the recipe with the given ID was not found
        res.status(404).json({ error: 'Recipe not found' });
      } else {
        // Recipe updated successfully
        res.json({ message: 'Recipe updated successfully' });
      }
    });
  });

// Update an instruction step for a recipe
app.put('/recipes/:recipeId/instructions/:stepNumber/update', (req, res) => {
    const { recipeId, stepNumber } = req.params;
    const updatedStep = req.body;
  
    // Check if the updated instruction step data is provided
    if (!updatedStep || !updatedStep.StepInstruction) {
      res.status(400).json({ error: 'Updated instruction step data is required, and StepInstruction must be provided' });
      return;
    }
  
    // Construct the SQL query to update the instruction step
    const updateQuery = `UPDATE InstructionStep SET StepInstruction = ? WHERE recipe_id = ? AND step_number = ? `;
    const updateParams = [updatedStep.StepInstruction, recipeId, stepNumber];
  
    // Execute the SQL update query
    db.run(updateQuery, updateParams, function (err) {
      if (err) {
        console.error('Error updating instruction step:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
  
      if (this.changes === 0) {
        // No rows were affected, indicating that the instruction step or recipe was not found
        res.status(404).json({ error: 'Instruction step or recipe not found' });
      } else {
        // Instruction step updated successfully
        res.json({ message: 'Instruction step updated successfully' });
      }
    });
});


/////////////////////////////////// DELETE API ////////////////////////////////////////////
// Delete an ingredient from a recipe
app.delete('/recipes/:recipeId/ingredients/:ingredientId/delete', (req, res) => {
    const { recipeId, ingredientId } = req.params;
  
    // Construct the SQL query to delete the ingredient from the recipe
    const deleteQuery = 'DELETE FROM RecipeIngredients WHERE recipe_id = ? AND ingredient_id = ?';
    const deleteParams = [recipeId, ingredientId];
  
    // Execute the SQL delete query
    db.run(deleteQuery, deleteParams, function (err) {
      if (err) {
        console.error('Error deleting ingredient from recipe:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
  
      if (this.changes === 0) {
        // No rows were affected, indicating that the ingredient or recipe was not found
        res.status(404).json({ error: 'Ingredient or recipe not found' });
      } else {
        // Ingredient deleted successfully from the recipe
        res.json({ message: 'Ingredient deleted successfully from the recipe' });
      }
    });
});


// Delete an instruction step from a recipe
app.delete('/recipes/:recipeId/instructions/:instructionId/delete', (req, res) => {
    const { recipeId, instructionId } = req.params;
  
    // Construct the SQL query to delete the instruction step from the recipe
    const deleteQuery = 'DELETE FROM InstructionStep WHERE recipe_id = ? AND instruction_id = ?';
    const deleteParams = [recipeId, instructionId];
  
    // Execute the SQL delete query
    db.run(deleteQuery, deleteParams, function (err) {
      if (err) {
        console.error('Error deleting instruction step from recipe:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
  
      if (this.changes === 0) {
        // No rows were affected, indicating that the instruction step or recipe was not found
        res.status(404).json({ error: 'Instruction step or recipe not found' });
      } else {
        // Instruction step deleted successfully from the recipe
        res.json({ message: 'Instruction step deleted successfully from the recipe' });
      }
    });
  });


// Delete a recipe and its related information
app.delete('/recipes/:recipeId/delete', (req, res) => {
    const { recipeId } = req.params;
  
    // Execute SQL transactions to delete recipe and related information
    db.run('BEGIN TRANSACTION', function (err) {
      if (err) {
        console.error('Error beginning transaction:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
  
      // Delete from InstructionStep
      db.run('DELETE FROM InstructionStep WHERE recipe_id = ?', [recipeId], function (err) {
        if (err) {
          console.error('Error deleting instruction steps:', err.message);
          db.run('ROLLBACK', () => {}); // Rollback transaction on error
          res.status(500).json({ error: 'Internal server error' });
          return;
        }
  
        // Delete from RecipeIngredients
        db.run('DELETE FROM RecipeIngredients WHERE recipe_id = ?', [recipeId], function (err) {
          if (err) {
            console.error('Error deleting recipe ingredients:', err.message);
            db.run('ROLLBACK', () => {}); // Rollback transaction on error
            res.status(500).json({ error: 'Internal server error' });
            return;
          }
  
          // Delete from RecipeDietaryInfo
          db.run('DELETE FROM RecipeDietaryInfo WHERE recipe_id = ?', [recipeId], function (err) {
            if (err) {
              console.error('Error deleting recipe dietary information:', err.message);
              db.run('ROLLBACK', () => {}); // Rollback transaction on error
              res.status(500).json({ error: 'Internal server error' });
              return;
            }
  
            // Delete from RecipeAllergiesInfo
            db.run('DELETE FROM RecipeAllergiesInfo WHERE recipe_id = ?', [recipeId], function (err) {
              if (err) {
                console.error('Error deleting recipe allergies information:', err.message);
                db.run('ROLLBACK', () => {}); // Rollback transaction on error
                res.status(500).json({ error: 'Internal server error' });
                return;
              }
  
              // Finally, delete the recipe itself
              db.run('DELETE FROM Recipes WHERE recipe_id = ?', [recipeId], function (err) {
                if (err) {
                  console.error('Error deleting recipe:', err.message);
                  db.run('ROLLBACK', () => {}); // Rollback transaction on error
                  res.status(500).json({ error: 'Internal server error' });
                  return;
                }
  
                // Commit the transaction if everything was successful
                db.run('COMMIT', () => {
                  res.json({ message: 'Recipe and related information deleted successfully' });
                });
              });
            });
          });
        });
      });
    });
});  
  
// Delete a cuisine and replace with International in related recipes
app.delete('/cuisines/:cuisineId/delete', (req, res) => {
    const { cuisineId } = req.params;
  
    // Step 1: Check if "International" cuisine exists, and add it if not
    db.get('SELECT cuisine_id FROM Cuisines WHERE name = ?', ['International'], (err, row) => {
      if (err) {
        console.error('Error checking for "International" cuisine:', err.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
  
      let internationalCuisineId = row ? row.cuisine_id : null;
  
      // If "International" cuisine doesn't exist, add it
      if (!internationalCuisineId) {
        db.run('INSERT INTO Cuisines (name) VALUES (?)', ['International'], function (err) {
          if (err) {
            console.error('Error adding "International" cuisine:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
          }
          internationalCuisineId = this.lastID; // Get the ID of the newly added cuisine
        });
      }
  
      // Step 2: Update related recipes to use International cuisine (if it exists)
      if (internationalCuisineId) {
        db.run('UPDATE Recipes SET cuisine_id = ? WHERE cuisine_id = ?', [internationalCuisineId, cuisineId], function (err) {
          if (err) {
            console.error('Error updating related recipes:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
          }
  
          // Step 3: Delete the specified cuisine
          db.run('DELETE FROM Cuisines WHERE cuisine_id = ?', [cuisineId], function (err) {
            if (err) {
              console.error('Error deleting cuisine:', err.message);
              res.status(500).json({ error: 'Internal server error' });
              return;
            }
  
            res.json({ message: 'Cuisine deleted and related recipes updated successfully' });
          });
        });
      } else {
        res.json({ message: 'Cuisine deleted successfully, "International" cuisine not found' });
      }
    });
  });
  


// Start the server
app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
